import {User} from '../../models'
import {Response} from 'express'
import {CustomRequest, ISignup} from '../../types'
import * as jwt from 'jsonwebtoken'
import {UserType} from '../../types'
import {Stripe} from '../../lib'

export default async (req: CustomRequest<ISignup>, res: Response) => {
	try {
		const {email, password, fname, lname, priceId} = req.body

		const _verify = await User.findOne({email})
		if (_verify) {
			return res.status(400).json({
				status: 'Failure',
				errors: [
					{
						name: 'Email is already in use.',
						field: 'email',
					},
				],
				requestTime: new Date().toISOString(),
			})
		}
		const _verifyPrice = await Stripe.prices?.retrieve(priceId)
		if (!_verifyPrice) {
			return res.status(404).json({
				status: 'Failure',
				message: 'Pricing was not found.',
				price: null,
				requestTime: new Date().toISOString(),
			})
		}
		const NEW_USER = await User.create({
			email,
			password,
			fname,
			lname,
			type: UserType.STANDARD,
			activePrice: priceId,
		})

		const payload = {
			email,
			fullName: NEW_USER.fullName,
			_id: NEW_USER._id,
			stripeId: NEW_USER.stripeId,
		}
		if (process.env.ACCESS_TOKEN_SECRET_V2) {
			jwt.sign(
				payload,
				process.env.ACCESS_TOKEN_SECRET_V2,
				{
					expiresIn: '24h',
				},
				async (_, encoded) => {
					console.log(`Access Token generated for Instructor : ${email}`)
					// const stripeCustomerInfo = await Stripe.customers?.retrieve(NEW_USER.stripeId)
					const paymentMethods = await Stripe.paymentMethods?.list({
						customer: NEW_USER.stripeId,
						type: 'card',
					})
					const subscriptions = await Stripe.subscriptions?.list({
						customer: NEW_USER.stripeId,
					})
					return res.status(200).json({
						status: 'success',
						message: 'User account was created successfully.',
						token: encoded,
						fullName: NEW_USER.fullName,
						email: NEW_USER.email,
						_id: NEW_USER._id,
						type: UserType.STANDARD,
						stripeId: NEW_USER.stripeId,
						paymentMethods: paymentMethods.data,
						subscriptions: subscriptions.data,
						inTrial: NEW_USER.inTrial,
						isTrialLegit: NEW_USER.isTrialLegit,
						activeSubscription: NEW_USER.activeSubscription,
						requestTime: new Date().toISOString(),
					})
				}
			)
		}
	} catch (err) {
		if (err instanceof Error) {
			console.log(err.message)
			return res.status(500).json({
				message: 'Internal Server Error',
				error: err.message,
				requestTime: new Date().toISOString(),
			})
		}
	}
}
