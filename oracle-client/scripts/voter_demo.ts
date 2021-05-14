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

  console.log("Sending add_voters call...");
  let tries = 1;
  while (tries <= 2) {
    try {
      console.log("Attempt " + tries);

      const add_voter_reply = await Election.methods
        .add_voters("gnf9LQqtoN+zif1hH5L+Fw==")
        .send({ gas: 200000 });

      console.log("Got reply, \n" + JSON.stringify(add_voter_reply));
      break;
    } catch (error) {
      console.error(error);
      console.log(error.data);

      if (error.message.includes("Voting is not started yet")) {
        console.log("Trying to start voting...");

        const start_voting_reply = await Election.methods.start_voting().send();
        console.log("Got reply, \n" + JSON.stringify(start_voting_reply));
      }
    }

    tries += 1;
  }
};

main()
  .catch((err) => console.error(err))
  .finally(() => process.exit());
