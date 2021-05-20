import chalk from "chalk";
import clear from "clear";
import prompts from "prompts";
import Web3 from "web3";
import ora from "ora";
import fs from "fs";
import Client from "../client";

const questions: prompts.PromptObject[] = [
  {
    type: "text",
    name: "address",
    message: "Your blockchain address " + chalk.gray("(ethereum address) :"),
    validate: (value) =>
      Web3.utils.isAddress(value) ? true : "Address is not valid",
  },
  {
    type: "text",
    name: "id",
    message: "Your voter ID number " + chalk.gray("(5 digit number) :"),
    validate: (value) =>
      /^[0-9]{5,5}$/.test(value) ? true : "ID is not valid",
  },
  {
    type: "text",
    name: "pin",
    message: "Your PIN number " + chalk.gray("(5 digit number) :"),
    validate: (value) =>
      /^[0-9]{5,5}$/.test(value) ? true : "PIN is not valid",
  },
];

const start = async () => {
  clear();
  console.log(chalk.cyan("DisProve") + " Voters Client");

  const voter_information = await prompts(questions);
  const spinner = ora("Connecting to network").start();

  const network_config = JSON.parse(
    fs.readFileSync("network-config.json", "utf-8")
  );
  const abi = JSON.parse(fs.readFileSync(network_config.build_file, "utf-8"))[
    "abi"
  ];

  const client = new Client(network_config, abi, voter_information, spinner);

  await client.registerVoter();
  await client.voteMenu();
  await client.revalidate();
};

start()
  .catch((err) => console.error(err))
  .finally(() => {
    process.exit();
  });
