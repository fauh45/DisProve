import Web3 from "web3";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";

type ValidVoters = {
  voters_id: String;
  voter_address: String;
};

type VoterDBSchema = {
  version: Number;
  valid: ValidVoters[];
};

const create_connection = (provider: string): Web3 => {
  return new Web3(new Web3.providers.WebsocketProvider(provider));
};

const get_contract = (
  web3: Web3,
  abi: any,
  address: string,
  oracle_address: string
) => {
  return new web3.eth.Contract(abi, address, {
    from: oracle_address,
  });
};

const start_listening = async (
  oracle_address: string,
  address_secret: string,
  abi: any,
  contract_address: string,
  provider: string,
  database_file: string
) => {
  const web3 = create_connection(provider);
  const Election = get_contract(web3, abi, contract_address, oracle_address);

  const adapter = new FileSync<VoterDBSchema>(database_file);
  const db = low(adapter);

  console.log("Starting to listen for events...");
  Election.events.ValidateVoters(
    { fromBlock: 0 },
    async (error: any, event: any) => {
      if (error) {
        console.error(error);
      } else {
        console.log(event);

        const query_result = db
          .get("valid")
          .find({
            voters_id: event.returnValues._voters_id,
          })
          .value();

        console.log(query_result);
        const valid =
          query_result.voter_address === event.returnValues._voter_address &&
          query_result.voters_id === event.returnValues._voters_id;

        try {
          console.log(`Validation result: ${valid ? "Valid" : "Not Valid"}`);
          console.log("Sending Validation Data...");

          const network_reply = await Election.methods
            .validate_voter(
              event.returnValues._voters_id,
              valid,
              event.returnValues._voter_address
            )
            .send({ gas: 300000 });
          console.log(JSON.stringify(network_reply));
        } catch (error) {
          console.error(error);
        }
      }
    }
  );
};

export default start_listening;
