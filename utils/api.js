const axios = require('axios');

const BASE_URL = 'https://blockchain.info/';
const API_CODE = '1770d5d9-bcea-4d28-ad21-6cbd5be018a8';

const getBcdcSession = async () => {
	return await axios
		.post(`${BASE_URL}/sessions`)
		.then(({ data }) => ({
			status: 'success',
			sessionToken: data.token
		}))
		.catch(() => ({
			status: 'error',
			message: 'Failed to obtain session token'
		}));
};

const getBcdcWallet = async ({ sessionToken, walletId }) => {
	return await axios
		.get(`${BASE_URL}/wallet/${walletId}?format=json&api_code=${API_CODE}`, {
			headers: {
				authorization: `Bearer ${sessionToken}`
			}
		})
		.then(({ data }) => {
			// if we have a response, there was no email or 2fa on wallet
			// parse contents and return payload
			return {
				status: 'success',
				payload: JSON.parse(data.payload)['payload']
			};
		})
		.catch(({ response }) => {
			const error = response.data.initial_error.toLowerCase();
			console.log(error)
			// error indicates guid doesnt exist
			if (error.includes('unknown wallet identifier')) {
				return {
					status: 'error',
					message: 'Wallet ID does not exist'
				};
			}
			// error indicates email authorization required
			if (error.includes('authorization required') && error.includes('email')) {
				return {
					status: 'pending',
					message:
						'Email authorization required. Please authorize login via your email now.'
				};
			}
		});
};

const pollForEmailAuth = async ({ sessionToken }) => {
	let emailAuthorized = false;
	const delay = time => {
		return new Promise(resolve => setTimeout(resolve, time));
	};

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
			.then(async ({ data }) => {
				if (data.guid) {
					emailAuthorized = true
				} else {
					await delay(3000);
				}
			})
			.catch(({ data }) => {
				return {
					status: 'error',
					message: data.toString()
				};
			});
	}
	return {
		status: 'success'
	}
};

module.exports = {
	getBcdcSession,
	getBcdcWallet,
	pollForEmailAuth
};
