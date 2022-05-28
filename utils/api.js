const axios = require('axios');
const querystring = require('querystring');

const BASE_URL = 'https://blockchain.info/';
const API_CODE = '1770d5d9-bcea-4d28-ad21-6cbd5be018a8';

const determine2faType = (authType) => {
	switch (authType) {
		case 1:
			return 'Yubikey'
		case 4:
			return 'Google Authenticator'
		case 5:
			return 'SMS'
	}
}

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
		.then(({data}) => {
			// check if 2fa is required
			if (data.auth_type) {
				return {
					status: 'pending 2fa',
					wallet2faType: determine2faType(data.auth_type)
				};
			}

			// if we made it this far, there was no email or 2fa on wallet
			// parse contents and return payload
			return {
				status: 'success',
				payload: JSON.parse(data.payload)['payload']
			};
		})
		.catch(({ response }) => {
			const error = response.data.initial_error.toLowerCase();
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
					message: 'email'
				};
			}
			return {
				status: 'error',
				message: response.data.toString()
			};
		});
};

const getBcdcWallet2fa = async ({ sessionToken, wallet2faCode, walletId }) => {
	return await axios({
		method: 'post',
		url: `${BASE_URL}/wallet`,
		data: querystring.stringify({
			api_code: API_CODE,
			guid: walletId,
			length: wallet2faCode.length,
			method: 'get-wallet',
			payload: wallet2faCode
		}),
		headers: {
			authorization: `Bearer ${sessionToken}`,
			'content-type': 'application/x-www-form-urlencoded'
		}
	})
		.then(({ data }) => ({
			status: 'success',
			payload: data.payload
		}))
		.catch(({ response }) => ({
			status: 'error',
			payload: response.data,
			isWalletLocked: !response.data.includes('login attempts left')
		}));
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
					emailAuthorized = true;
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
	};
};

module.exports = {
	getBcdcSession,
	getBcdcWallet,
	getBcdcWallet2fa,
	pollForEmailAuth
};