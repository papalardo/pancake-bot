```bash
npm i
cp config.js.example config.js
```

> Config `config.js` file

```bash
npm run start
```

## Configurações:
- MNEMONIC = Chave da carteira
- INPUT_TOKEN_ADDRESS -> Token que será trocando
- OUTPUT_TOKEN_ADDRESS -> Token que será comprado
- AMOUNT_BUY -> Valor que será usado do [INPUT_TOKEN_ADDRESS] para realizar a troca
- SLIPPAGE_TYPE
    - percent -> Irá calcular a porcentagem que irá receber de [OUTPUT_TOKEN_ADDRESS] em cima do valor calculado da pool
    - absolute -> Usa um valor fíxo mínimo de [OUTPUT_TOKEN_ADDRESS] que quer ter ao final da troca dos tokens

## Obs:
Caso use BNB para realizar as compras, vai ser necessário ter WBNB na carteira para que funcione.
Ou seja, é necessário trocar BNB > WBNB e ter WBNB na carteira antes de executar o bot.
