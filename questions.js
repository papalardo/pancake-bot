import inquirer from 'inquirer';

export const questionBuyTokenAddress = () => inquirer.prompt([
    {
        type: 'input',
        name: 'token',
        message: 'Digite o contrato do token que deseja comprar:'
    }
]).then((answers) => answers.token);

export const questionPaymentTokenAddress = () => inquirer.prompt([
    {
        type: 'list',
        message: 'Qual token do pagamento?',
        name: 'paymentTokenAddress',
        choices: [
            {
                name: 'WBNB',
                value: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
            },
            {
                name: 'BUSD',
                value: '0xe9e7cea3dedca5984780bafc599bd69add087d56'
            },
            {
                name: 'Outro',
                value: 'custom'
            },
        ],
    },
    {
        type: 'input',
        name: 'paymentTokenAddressCustom',
        message: 'Digite o token do pagamento.',
        when: (answers) => answers.paymentTokenAddress === 'custom',
    },
]).then((answers) => answers.paymentTokenAddressCustom || answers.paymentTokenAddress)
