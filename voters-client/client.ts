import ora from "ora";
import Web3 from "web3";
import crypto from "crypto";
import chalk from "chalk";
import clear from "clear";
import prompts from "prompts";

const sleep = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

class Client {
  private provider: string;
  private contract_address: string;
  private candidate_count: number;
  private abi: any;

  private voter_address: string;
  private voter_id: string;
  private voter_pin: string;
  private voter_hash: string;

  private spinner: ora.Ora;

  private web3: Web3;
  private Election;

  constructor(
    network_config: any,
    abi: any,
    voter_info: any,
    spinner: ora.Ora
  ) {
    this.provider = network_config.provider;
    this.contract_address = network_config.contract_address;
    this.candidate_count = network_config.candidate_count;
    this.abi = abi;

    this.voter_address = voter_info.address;
    this.voter_id = voter_info.id;
    this.voter_pin = voter_info.pin;
    this.voter_hash = this.generateHash();

    this.spinner = spinner;

    this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.provider));
    this.Election = new this.web3.eth.Contract(
      this.abi,
      this.contract_address,
      {
        from: this.voter_address,
      }
    );

    this.spinner.succeed("Connected to the network");
    console.log("Your voter hash : " + chalk.green(this.voter_hash));
  }

  private generateHash(): string {
    const sha1 = crypto.createHash("sha1");
    sha1.update(this.voter_id + this.voter_pin);

    return sha1.digest("hex");
  }

  public async registerVoter() {
    this.spinner.start("Registering");

    while (true) {
      try {
        await this.Election.methods
          .add_voters(this.voter_hash)
          .send({ gas: 200000 });

        this.spinner.succeed("Registered");
        break;
      } catch (error) {
        if (error.message.includes("Voting is not started yet")) {
          this.spinner.text = "Voting is not started, trying to start";
          await this.Election.methods.start_voting().send();

          continue;
        } else if (error.message.includes("Voters already exist")) {
          this.spinner.succeed("Already registered");

          break;
        } else {
          this.spinner.fail(error.message);

          break;
        }
      }
    }
  }

  private async sendVote(choice: number): Promise<string> {
    const add_voter_reply = await this.Election.methods
      .vote(this.voter_hash, choice)
      .send({ gas: 200000 });

    return add_voter_reply.transactionHash;
  }

  public async voteMenu() {
    this.spinner.start("Getting candidate");
    let candidates: prompts.Choice[] = [];

    for (let i = 0; i < this.candidate_count; i++) {
      const candidate_response = await this.Election.methods
        .candidates(i)
        .call();

      candidates.push({
        title: candidate_response.name,
      });
    }

    let tries = 0;
    while (true) {
      try {
        clear();
        this.spinner.info("Please vote a candidate");

        const vote = await prompts({
          type: "select",
          name: "choice",
          message:
            "Vote a candidate" +
            chalk.gray(" (empty means you do not vote any of the candidate)"),
          choices: candidates,
        });

        this.spinner.start("Sending your vote");
        const tx_hash = await this.sendVote(vote.choice);

        this.spinner.succeed("Successfully sends your vote");
        console.log("\nYour vote receipt : " + chalk.green(tx_hash));

        break;
      } catch (error) {
        tries += 1;
        if (
          error.message.includes("Voter address is not yet received") &&
          tries <= 3
        ) {
          this.spinner.info("Waiting for verification for 5 second");

          await sleep(5000);

          continue;
        } else if (
          error.message.includes("You don't have any vote allowed anymore")
        ) {
          this.spinner.fail("You can only vote once!");

          break;
        } else if (tries > 3) {
          this.spinner.fail("Too many tries");

          break;
        } else {
          this.spinner.fail(error.message);

          break;
        }
      }
    }
  }

  public async revalidate() {
    this.spinner.start("Re validating your vote");

    try {
      const get_vote_reply = await this.Election.methods
        .get_my_vote(this.voter_hash)
        .call({ gas: 200000 });

      this.spinner.succeed("Done revalidating");
      console.log(
        "\nValidated : " +
          `${get_vote_reply.validated ? chalk.green("yes") : chalk.red("no")}` +
          "\nVoted for candidate number : " +
          chalk.cyan(get_vote_reply.vote_for)
      );
    } catch (error) {
      this.spinner.fail(error.message);
    }
  }
}

export default Client;
