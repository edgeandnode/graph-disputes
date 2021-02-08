import inquirer from 'inquirer'

export const askConfirm = async (message: string): Promise<boolean> => {
  const res = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message,
  })
  return res.confirm
}
