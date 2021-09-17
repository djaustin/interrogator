import chalk = require("chalk");
import { program } from "commander";
import dayjs = require("dayjs");
import { promises as fs } from "fs";
import { getConnection } from "oracledb";
import OracleDB = require("oracledb");
import { performance } from 'perf_hooks'

const parseIntFromString = (value: string) => parseInt(value);

program
  .name('interrogator')
  .description(
    "Queries a database on a schedule and records the round trip time to a CSV file"
  )
  .requiredOption(
    "-c --connectString <string>",
    "An Oracle connection string for the target database (e.g. 192.168.1.11:1521/MYDATABASE.WORLD)"
  )
  .requiredOption(
    "-u --username <name>",
    "The username of the Oracle user with which to connect"
  )
  .requiredOption(
    "-p --password <password>",
    "The password of the Oracle user with which to connect"
  )
  .requiredOption(
    "-f --file <path>",
    "An SQL file containing the query to be run"
  )
  .option(
    "-p --period <seconds>",
    "The number of seconds to wait between calls",
    parseIntFromString,
    60
  ).option(
    "-o --output <path>",
    "The path of the output file",
    "out.csv"
  )
  ;

program.parse();

const { period, file, output, connectString, username, password } = program.opts<{ period: number; file: string; connectString: string; username: string; password: string; output: string;}>();

async function main() {
  console.log(chalk`{blue Reading SQL from ${file}...}`)
  const sql = (await fs.readFile(file)).toString('utf8')
  console.log(chalk`{green Read SQL from ${file}}`)

  console.log(chalk`{blue Acquiring database connection...}`)
  const db = await getConnection({
    connectionString: connectString,
    user: username,
    password: password,
  });
  console.log(chalk`{green Successfully acquired database connection}`)
  
  console.log(chalk`{blue Setting up polling...}`)
  setInterval(async () => {
    console.log(chalk`{blue Sending query to database...}`)
    const start = dayjs()
    try {
      const res = await db.execute(sql);
      console.log(res.rows?.length)
      const end = dayjs()
      console.log(chalk`{blue Writing result to ${output}...}`)
      await fs.appendFile('out.log', `${start.toISOString()},${end.toISOString()},${end.diff(start, 'ms')}\n`)
      console.log(chalk`{green Result written to ${output}}`)
    } catch (err) {
      console.log(chalk`{red ${err}}`)
    }
  }, period * 1000);
  console.log(chalk`{green Polling set up}`)
}



main().catch(e => console.log(chalk`{red ${e}}`));
