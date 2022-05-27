#!/usr/bin/env node

const axios = require('axios');
const cli = require('./utils/cli');

(async () => {
	cli.initCli()

	// get wallet id from user
	const { walletId } = await cli.promptForWalletId()


	const BASE_URL = 'https://blockchain.info/';
	const API_CODE = '1770d5d9-bcea-4d28-ad21-6cbd5be018a8';
	const WALLET_ID_NO_AUTH = '16b2a2d6-449a-4fd3-b9b5-482d1a574232';
	const WALLET_ID_EMAIL_ONLY = 'de327a91-179d-433f-a7bd-7c10574fa42a';
	const WALLET_ID_EMAIL_AND_2FA = '6c9be814-6d95-4259-bbb1-aa0b1acff7b6';

	const WALLET_ID = WALLET_ID_EMAIL_AND_2FA

	const getWallet = async () => {
		let sessionToken;
		return new Promise(async (resolve, reject) => {
			await axios
				.post(`${BASE_URL}/sessions`)
				.then(async resp => {
					sessionToken = resp.data.token;

					await axios
						.get(
							`${BASE_URL}/wallet/${WALLET_ID}?format=json&api_code=${API_CODE}`,
							{
								headers: {
									authorization: `Bearer ${sessionToken}`
								}
							}
						)
						.then(resp => {
							// no 2fa or email auth
							resolve(JSON.parse(resp.data.payload)['payload']);
						})
						.catch(async ({ response }) => {
							const error =
								response.data.initial_error.toLowerCase();
							if (error.includes('unknown wallet identifier')) {
								reject('ERROR: unknown wallet id');
							}
							if (
								error.includes('authorization required') &&
								error.includes('email')
							) {
								console.log(error);
								let emailAuthorized = false;
								function delay(time) {
									return new Promise(resolve =>
										setTimeout(resolve, time)
									);
								}
								while (!emailAuthorized) {
									await axios
										.get(
											`${BASE_URL}/wallet/poll-for-session-guid?format=json&api_code=${API_CODE}`,
											{
												headers: {
													authorization: `Bearer ${sessionToken}`
												}
											}
										)
										.then(async resp => {
											console.log(`POLLING`);
											if (resp.data.guid) {
												console.log(`AUTHORIZED`);
												emailAuthorized = true;
												// EMAIL AUTHORIZED, GET WALLET
												await axios
													.get(
														`${BASE_URL}/wallet/${WALLET_ID}?format=json&api_code=${API_CODE}`,
														{
															headers: {
																authorization: `Bearer ${sessionToken}`
															}
														}
													)
													.then(resp => {
														try {
															// WALLET PAYLOAD RECEIVED
															resolve(JSON.parse(resp.data.payload)['payload']);
														} catch (e) {
															// WALLET HAS 2FA
															console.log("2FA enabled, enter your 2FA code")
														}

													})
													.catch(error => {
														reject(error);
													});
											} else {
												await delay(2000);
											}
										})
										.catch(error => {
											reject(error.data);
										});
								}
							}
						});
				})
				.catch(() => {
					reject('ERROR: failed to get session token');
				});
		});
	};

	getWallet()
		.then(payload => {
			// console.log(`PAYLOAD: ${x}`)
			console.log(payload);
		})
		.catch(err => {
			console.log(`DONE ERROR: ${err}`);
		});
})();
