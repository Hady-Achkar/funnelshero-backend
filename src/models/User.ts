import {model, Schema} from 'mongoose'
import * as bcrypt from 'bcryptjs'
import {IUser} from '../types'
import {Stripe} from '../lib'

const UserSchema = new Schema<IUser>(
	{
		fullName: {
			type: String,
			trim: true,
		},
		fname: {
			type: String,
			required: [true, 'fname is a require field'],
			trim: true,
		},
		lname: {
			type: String,
			required: [true, 'lname is a require field'],
			trim: true,
		},
		password: {
			type: String,
			required: [true, 'password is a required field '],
		},
		email: {
			type: String,
			unique: true,
			required: [true, 'email is a required field'],
		},
		type: {
			type: String,
			required: [true, 'type is a required field'],
		},
		stripeId: {
			type: String,
			trim: true,
		},
		activeSubscription: {
			type: String,
			default: '',
		},
		inTrial: {
			type: Boolean,
			default: false,
		},
		isTrialLegit: {
			type: Boolean,
			default: true,
		},
		activePrice: {
			type: String,
			default: '',
		},
	},
	{
		timestamps: true,
		minimize: false,
		versionKey: false,
	}
)

UserSchema.index({
	fullName: 'text',
	email: 'text',
	type: 'text',
	stripeId: 'text',
})
UserSchema.pre('save', async function (next) {
	const fname = this.fname
		.split(' ')
		.map((val: string) => val.charAt(0).toUpperCase() + val.slice(1))
		.join(' ')
	this.fname = fname
	const lname = this.lname
		.split(' ')
		.map((val: string) => val.charAt(0).toUpperCase() + val.slice(1))
		.join(' ')
	this.lname = lname
	this.fullName = `${fname} ${lname}`
	this.email = this.email.toLowerCase()
	this.password = await bcrypt.hash(this.password, 10)
	const stripeCustomer = await Stripe.customers.create({
		email: this.email,
		name: `${fname} ${lname}`,
	})
	this.inTrial = true
	this.isTrialLegit = false
	this.stripeId = stripeCustomer.id
	this.activeSubscription = ''
	next()
})
export default model<IUser>('User', UserSchema)
