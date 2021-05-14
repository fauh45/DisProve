import Web3 from "web3";
import yargs from "yargs";
import fs from "fs";

const options = yargs.option("o", {
  description: "Path to config file",
  type: "string",
  demandOption: true,
  default: "../example/ganache-config-voter-demo.json",
}).argv;

const config_file = JSON.parse(fs.readFileSync(options.o, "utf-8"));
const abi = JSON.parse(fs.readFileSync(config_file.build_file, "utf-8"))["abi"];

console.log(`Using configuration file ${options.o}`);
console.log(config_file);

const main = async () => {
  const web3 = new Web3(
    new Web3.providers.WebsocketProvider(config_file.provider)
  );
  const Election = new web3.eth.Contract(abi, config_file.contract_address, {
    from: config_file.voter.account,
  });

  try {
    const add_voter_reply = await Election.methods
      .vote("gnf9LQqtoN+zif1hH5L+Fw==", 3)
      .send({ gas: 200000 });

    console.log("Got reply, \n" + JSON.stringify(add_voter_reply));
  } catch (error) {
    console.error(error);
    console.log(error.data);
  }

  try {
    const get_vote_reply = await Election.methods
      .get_my_vote("gnf9LQqtoN+zif1hH5L+Fw==")
      .call({ gas: 200000 });

    console.log("Got reply, \n" + JSON.stringify(get_vote_reply));
  } catch (error) {
    console.error(error);
    console.log(error.data);
  }
};

main()
  .catch((err) => console.error(err))
  .finally(() => process.exit());
