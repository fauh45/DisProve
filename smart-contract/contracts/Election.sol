// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

contract Election {
    struct Candidate {
        string name;
        uint256 vote_count;
    }

    struct Voter {
        bool exist;
        address voter_address;
        bool validated;
        mapping(address => bool) validator_list;
        uint8 vote_count;
        uint256 vote_for;
    }

    event ValidateVoters(string _voters_id, address _voter_address);

    bool public is_running = false;

    address public owner;
    address[] public oracles;
    address public designated_voter_address_repo;

    uint256 public min_consensus;

    Candidate[] public candidates;
    string[] voter_list;
    mapping(string => Voter) public voters;

    uint256 public start_date;
    uint256 public end_date;

    constructor(
        uint256 _start_date,
        uint256 _end_date,
        uint256 _min_consensus,
        string[] memory _candidates,
        address[] memory _oracles,
        uint256 _oracle_to_be_voter_address_repo
    ) {
        owner = msg.sender;

        start_date = _start_date;
        end_date = _end_date;

        min_consensus = _min_consensus;

        oracles = _oracles;
        designated_voter_address_repo = _oracles[
            _oracle_to_be_voter_address_repo
        ];

        candidates.push(Candidate("Empty", 0));
        for (uint256 i = 0; i < _candidates.length; i++) {
            candidates.push(Candidate(_candidates[i], 0));
        }
    }

    modifier oracle_only {
        bool is_msg_oracle = false;
        for (uint256 i = 0; i < oracles.length; i++) {
            if (msg.sender == oracles[i]) {
                is_msg_oracle = true;
            }
        }
        require(is_msg_oracle, "Function are for oracles only");
        _;
    }

    modifier owner_only {
        require(
            msg.sender == owner,
            "Function are for smart contract owner only"
        );
        _;
    }

    modifier voters_only {
        require(msg.sender != owner, "Owner cannot vote");
        for (uint256 i = 0; i < oracles.length; i++) {
            require(msg.sender != oracles[i], "Oracle cannot vote");
        }
        _;
    }

    modifier only_started {
        require(is_running, "Voting is not started yet");
        require(
            block.timestamp >= start_date,
            "Current time is before start time"
        );
        require(block.timestamp < end_date, "Current time is after end time");
        _;
    }

    function validate_voter(
        string memory voter_id,
        bool valid,
        address _voter_address
    ) public oracle_only only_started {
        require(
            voters[voter_id].validator_list[msg.sender] != true,
            "Already validate this voters"
        );

        voters[voter_id].validator_list[msg.sender] = valid;

        if (
            calculate_consensus(voters[voter_id].validator_list) >=
            min_consensus
        ) {
            voters[voter_id].validated = true;
        }

        if (msg.sender == designated_voter_address_repo) {
            voters[voter_id].voter_address = _voter_address;
        }
    }

    function calculate_consensus(
        mapping(address => bool) storage validator_list
    ) private view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < oracles.length; i++) {
            if (validator_list[oracles[i]]) {
                count += 1;
            }
        }

        return count;
    }

    function add_oracle(address oracle) public owner_only {
        require(
            !is_running,
            "Adding oracle after voting is started is not allowed"
        );

        oracles.push(oracle);
    }

    function change_designated_address_repo(uint256 _index_of_oracles)
        public
        owner_only
    {
        designated_voter_address_repo = oracles[_index_of_oracles];
    }

    function start_voting() public {
        require(
            block.timestamp >= start_date,
            "Current time is before start time"
        );
        require(block.timestamp < end_date, "Current time is after end time");
        require(!is_running, "Vote is already running");

        is_running = true;
    }

    function end_voting() public {
        require(
            block.timestamp > start_date,
            "Current time is before start time"
        );
        require(block.timestamp > end_date, "Current time is under end time");
        require(is_running, "Vote is not running");

        is_running = false;
        final_count();
    }

    function final_count() private {
        for (uint256 i = 0; i < candidates.length; i++) {
            candidates[i].vote_count = 0;
        }

        for (uint256 i = 0; i < voter_list.length; i++) {
            Voter storage voter = voters[voter_list[i]];
            if (voter.exist && voter.validated) {
                candidates[voter.vote_for].vote_count += 1;
            }
        }
    }

    function add_voters(string memory voter_id)
        public
        voters_only
        only_started
    {
        require(!voters[voter_id].exist, "Voters already exist");

        voters[voter_id].exist = true;
        voters[voter_id].voter_address = address(0);
        voters[voter_id].validated = false;
        voters[voter_id].vote_count = 1;
        voters[voter_id].vote_for = 0;

        voter_list.push(voter_id);

        emit ValidateVoters(voter_id, msg.sender);
    }

    function vote(string memory voter_id, uint256 _vote_for)
        public
        only_started
        voters_only
    {
        require(voters[voter_id].exist, "Voter is not exist");
        require(
            voters[voter_id].voter_address != address(0),
            "Voter address is not yet received"
        );
        require(
            voters[voter_id].voter_address == msg.sender,
            "You are not allowed to vote for someone else"
        );
        require(
            voters[voter_id].vote_count >= 1,
            "You don't have any vote allowed anymore"
        );
        require(
            _vote_for >= 0 && _vote_for < candidates.length,
            "Illegal choice"
        );

        voters[voter_id].vote_count -= 1;
        voters[voter_id].vote_for = _vote_for;

        candidates[_vote_for].vote_count += 1;
    }

    function get_my_vote(string memory voter_id)
        public
        view
        returns (bool validated, uint256 vote_for)
    {
        return (voters[voter_id].validated, voters[voter_id].vote_for);
    }
}
