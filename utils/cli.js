const { prompt } = require('enquirer')
const unhandled = require("cli-handle-unhandled");
const welcome = require("cli-welcome");
const guid = require("guid")
const pkg = require("./../package.json");


const initCli = () => {
  unhandled();
  welcome({
    title: `bcdc-encrypted-wallet-extract`,
    tagLine: `by schnogz`,
    description: pkg.description,
    version: pkg.version,
    bgColor: '#36BB09',
    color: '#000000',
    bold: true,
    clear: true
  });
}

const promptForWalletId = async () => {
  return await prompt([
    {
      type: 'input',
      name: 'walletId',
      message: 'Enter wallet id (e.g. 1e8ecc37-c6dc-4cad-a574-af8490d40a91)',
      validate: (value) => {
        if (!value) return 'wallet id is required'
        if (!guid.isGuid(value)) return 'wallet id must be valid guid'
        return true
      }
    }
  ])
}

const promptForWallet2fa = async () => {
  return await prompt([
    {
      type: 'input',
      name: 'wallet2faCode',
      message: 'Enter 2fa code',
      validate: (value) => {
        if (!value) return '2fa code is required'
        return true
      }
    }
  ])
}

module.exports = {
  initCli,
  promptForWallet2fa,
  promptForWalletId
}