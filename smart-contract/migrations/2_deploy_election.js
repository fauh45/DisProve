const Election = artifacts.require("Election");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(
    Election,
    Math.floor(Date.now() / 1000) - 60 * 2,
    Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 256,
    2,
    ["Saya", "Kamu", "Dia"],
    [accounts[1], accounts[2], accounts[3]],
    0
  );
};
