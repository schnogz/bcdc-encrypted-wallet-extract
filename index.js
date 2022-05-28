#!/usr/bin/env node

const axios = require('axios');
const cli = require('./utils/cli');
const api = require('./utils/api');

(async () => {
	cli.initCli();

	// get wallet id from user
	const { walletId, saveToJsonFile } =
		await cli.promptForWalletIdAndOutputMode();

	// TODO: remove, testing purposes only
	// const WALLET_ID_NO_AUTH = '16b2a2d6-449a-4fd3-b9b5-482d1a574232';
	// const WALLET_ID_EMAIL_ONLY = 'de327a91-179d-433f-a7bd-7c10574fa42a';
	// const WALLET_ID_EMAIL_AND_2FA = '6c9be814-6d95-4259-bbb1-aa0b1acff7b6';
	//
	// const WALLET_ID = WALLET_ID_EMAIL_AND_2FA;

	const getPayloadTask = async () => {
		return new Promise(async (resolve, reject) => {
			// obtain session token
			const {
				status: sessionStatus,
				sessionToken,
				message: sessionMessage
			} = await api.getBcdcSession();
			if (sessionStatus === 'error') return reject(sessionMessage);

			// attempt to get wallet payload
			const {
				status: walletStatus,
				payload: walletPayload,
				message: walletMessage
			} = await api.getBcdcWallet({
				sessionToken,
				walletId
			});
			if (walletStatus === 'success') {
				return resolve(walletPayload);
			}
			if (walletStatus === 'error') {
				return reject(walletMessage);
			}

			// neither success or error, start polling for email authorization
			console.log(`Waiting for email verification...`);
			const { status: pollStatus, message: pollMessage } = await api.pollForEmailAuth({ sessionToken });
			if (pollStatus === 'error') {
				return reject(pollMessage);
			}

			// email authorization complete, again attempt to obtain payload
			console.log(`Email authorization success! Continuing...`);

			const {
				status: wallet2ndStatus,
				payload: wallet2ndPayload,
				message: wallet2ndMessage
			} = await api.getBcdcWallet({
				sessionToken,
				walletId
			});
			if (wallet2ndStatus === 'success') {
				return resolve(wallet2ndPayload);
			}
			if (wallet2ndStatus === 'error') {
				return reject(wallet2ndMessage);
			}

			// 2fa is also required
			// TODO
		});
	};

	getPayloadTask()
		.then(payload => {
			if (saveToJsonFile) {
				return console.log(`SAVE TO FILE: ${payload}`)
			}
			console.log(payload);
		})
		.catch(err => {
			console.log(`Error: ${err}`);
		});
})();
