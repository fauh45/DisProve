#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import listener from "../listener";

const options = yargs
  .version("1.0.0")
  .usage("Usage: disprove-oracle [options]")
  .options("o", {
    alias: "options",
    describe: "Path to provided oracle config file",
    type: "string",
    demandOption: true,
  })
  .options("d", {
    alias: "data",
    describe: "Path to validated voters data file",
    type: "string",
    demandOption: true,
  }).argv;

const config_file = JSON.parse(fs.readFileSync(options.o, "utf-8"));
const abi = JSON.parse(fs.readFileSync(config_file.build_file, "utf-8"))["abi"];

console.log(`Using configuration file ${options.o}`);
console.log(config_file);

console.log(`Using database file ${options.d}`);

listener(
  config_file.account,
  config_file.private_key,
  abi,
  config_file.contract_address,
  config_file.provider,
  options.d
);
