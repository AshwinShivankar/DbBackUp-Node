const cronJob = require("node-cron");
const moment = require("moment");
const path = require("path");
const mysql = require("mysql2/promise");
const fs = require("fs");
const { dbList } = require("../helpers/mysqlConnection");
const { uploadBackup } = require("../helpers/helper");

async function backupDatabase(config) {
  const { host, user, password, database, table } = config;

  const connection = await mysql.createConnection({
    //create connection
    host,
    user,
    password,
    database,
  });

  // Fetch tables, views, procedures, and functions
  const [tables] = await connection.query(
    'SHOW FULL TABLES WHERE Table_type = "BASE TABLE"'
  );
  const [views] = await connection.query(
    'SHOW FULL TABLES WHERE Table_type = "VIEW"'
  );
  const [procedures] = await connection.query("SHOW PROCEDURE STATUS");
  const [functions] = await connection.query("SHOW FUNCTION STATUS");

  if (
    tables.length === 0 &&
    views.length === 0 &&
    procedures.length === 0 &&
    functions.length === 0
  ) {
    console.log(
      "No tables, views, procedures, or functions found in the database"
    );
    return;
  }

  let backup = "";

  // Backup table structures and data
  for (const item of tables) {
    const [firstKey, firstValue] = Object.entries(item)[0];

    // Get column names and data types
    const [columns] = await connection.query(
      `SHOW COLUMNS FROM \`${firstValue}\``
    );
    const columnInfo = columns.map((column) => ({
      name: column.Field,
      type: column.Type,
    }));

    backup += `-- Table: ${firstValue} Structure --\n`;
    const [createTable] = await connection.query(
      `SHOW CREATE TABLE \`${firstValue}\``
    );
    backup += `${createTable[0]["Create Table"]};\n\n`;

    const [tableData] = await connection.query(
      `SELECT * FROM \`${firstValue}\``
    );

    if (tableData.length > 0) {
      backup += `-- Table: ${firstValue} Data --\n`;
      backup += `INSERT INTO ${firstValue} VALUES\n`;

      for (const row of tableData) {
        const escapedValues = [];
        for (const key in row) {
          let value = row[key];
          if (value === null) {
            escapedValues.push("NULL");
            continue;
          }
          // Check if the column type is text or varchar
          const columnType = columnInfo.find((col) => col.name === key)?.type;
          if (columnType && columnType.startsWith("datetime")) {
            value = moment(value).format("YYYY-MM-DD HH:mm:ss"); // Format datetime value
            value = `"${value}"`; // Enclose datetime values in double quotes
          } else if (columnType && columnType.startsWith("date")) {
            value = moment(value).format("YYYY-MM-DD"); // Format date value
            value = `"${value}"`; // Enclose date values in double quotes
          } else {
            value = typeof value === "string" ? `'${value}'` : value; // Enclose string values in double quotes
          }
          escapedValues.push(value);
        }
        backup += `(${escapedValues.join(",")}),\n`;
      }
      // Remove the trailing comma and newline
      backup = backup.slice(0, -2) + ";\n\n";
    } else {
      backup += `-- Table: ${firstValue} is empty --\n\n`;
    }
  }

  // Backup views
  for (const item of views) {
    const [firstKey, firstValue] = Object.entries(item)[0];

    const [createView] = await connection.query(
      `SHOW CREATE VIEW \`${firstValue}\``
    );
    backup += `-- View: ${firstValue} Definition --\n`;
    backup += `${createView[0]["Create View"]}\n\n`;
  }

  // Backup procedures
  for (const procedure of procedures) {
    const procedureName = procedure.Name;
    try {
      const [createProcedure] = await connection.query(
        `SHOW CREATE PROCEDURE \`${procedureName}\``
      );
      backup += `DELIMITER $$\n`;
      backup += `-- Procedure: ${procedureName} Definition --\n`;
      backup += `${createProcedure[0]["Create Procedure"]}\n`;
      backup += `DELIMITER ;\n\n`;
    } catch (error) {
      if (error.message.includes("does not exist")) {
        // console.log(`Procedure "${procedureName}" does not exist.`);
      } else {
        console.log(
          `Error fetching procedure definition for ${procedureName}: ${error.message}`
        );
      }
    }
  }

  // Backup functions
  for (const func of functions) {
    const funcName = func.Name;
    try {
      const [createFunc] = await connection.query(
        `SHOW CREATE FUNCTION \`${funcName}\``
      );
      backup += `-- Function: ${funcName} Definition --\n`;
      backup += `${createFunc[0]["Create Function"]}\n\n`;
    } catch (error) {
      if (error.message.includes("does not exist")) {
        // console.log(`Function "${funcName}" does not exist.`);
      } else {
        console.log(
          `Error fetching function definition for ${funcName}: ${error.message}`
        );
      }
    }
  }

  await connection.end();

  const filename = `${database}.sql`;
  const filePath = path.join("uploads", filename);

  // Write the file
  fs.writeFileSync(filePath, backup);

  await uploadBackup(filename);

  console.log(`Database backup created: ${filename}`);
}

////////// Runs Everyday at 01:00 PM //////////
cronJob.schedule("00 01 * * *", async () => {
  for (const db of dbList) {
    backupDatabase(db).catch((err) => console.error(err));
  }
});
