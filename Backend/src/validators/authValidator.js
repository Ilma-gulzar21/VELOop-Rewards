import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must contain at least 2 characters')
    .max(50, 'Name is too long'),

  email: z.string()
    .trim()
    .email('Please enter a valid email')
    .transform(value => value.toLowerCase()),

  password: z.string()
    .min(8, 'Password must contain at least 8 characters')
    .max(72, 'Password is too long'),

  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})
export const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('Please enter a valid email')
    .transform(value => value.toLowerCase()),

  password: z.string()
    .min(1, 'Password is required')
})