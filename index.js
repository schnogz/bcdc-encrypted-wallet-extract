#!/usr/bin/env node

const fs = require('fs');
const cli = require('./utils/cli');
const api = require('./utils/api');

(async () => {
	cli.initCli();

	// get wallet id from user
	const { walletId, saveToJsonFile } =
		await cli.promptForWalletIdAndOutputMode();

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
				message: walletStatusMessage
			} = await api.getBcdcWallet({
				sessionToken,
				walletId,
				isEmailAuthorized: false
			});
			if (walletStatus === 'success') {
				return resolve(walletPayload);
			}
			if (walletStatus === 'error') {
				return reject(walletStatusMessage);
			}

			// email verification required, start polling for user response
			console.log(`Waiting for email verification...`);
			const { status: pollStatus, message: pollMessage } =
				await api.pollForEmailAuth({ sessionToken });
			if (pollStatus === 'error') {
				return reject(pollMessage);
			}

			// email authorization complete, again attempt to obtain payload
			console.log(`Email authorization success! Continuing...`);
			const {
				status: walletEmailStatus,
				payload: walletEmailPayload,
				message: walletEmailMessage
			} = await api.getBcdcWallet({
				sessionToken,
				walletId
			});
			if (walletEmailStatus === 'success') {
				return resolve(walletEmailPayload);
			}
			if (walletEmailStatus === 'error') {
				return reject(walletEmailMessage);
			}

			// wallet has 2fa protection, start a loop that prompts user for 2fa code and attempts to access payload
			let hasCorrect2fa = false;
			while (!hasCorrect2fa) {
				const { wallet2faCode } = await cli.promptForWallet2fa();
				const {
					status: wallet2faStatus,
					payload: wallet2faPayload,
					message: wallet2faMessage,
					isWalletLocked
				} = await api.getBcdcWallet2fa({
					sessionToken,
					wallet2faCode,
					walletId
				});
				if (wallet2faStatus === 'success') {
					hasCorrect2fa = true;
					return resolve(wallet2faPayload);
				}
				// too many failed 2fa attempts
				if (isWalletLocked) {
					return reject(
						'Wallet is locked due to too many failed 2FA attempts. Please try again later'
					);
				}
				// user most likely entered wrong 2fa code
				if (wallet2faStatus === 'error') {
					console.log(wallet2faMessage);
				}
			}
		});
	};

	getPayloadTask()
		.then(payload => {
			if (saveToJsonFile) {
				try {
					fs.writeFileSync(`./wallet.aes.json`, payload.toString());
					console.log(
						`Success! Your encrypted wallet payload has been saved locally as wallet.aes.json`
					);
				} catch (err) {
					console.log(`Encrypted Wallet Payload`);
					console.log('');
					console.log(payload);
					console.log('');
					console.log(
						`Error: Failed to write to filesystem. Copy and manually save your payload from above.`
					);
				}
			} else {
				console.log(`Encrypted Wallet Payload`);
				console.log('');
				console.log(payload);
				console.log('');
			}
		})
		.catch(err => {
			console.log(`Error: ${err}`);
		});
})();
