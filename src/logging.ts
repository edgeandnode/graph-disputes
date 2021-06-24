import winston, { format } from 'winston'

const { printf } = format

const customFormat = printf(({ message }) => {
  return `${message}`
})

export const log = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: customFormat,
    }),
  ],
})
