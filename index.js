import ethers from 'ethers';

import PancakeSwapRouterV2ABI from './abi/pancake_swap_router_v2.json';
import PancakeSwapFactoryABI from './abi/pancake_swap_factory.json';
import PancakeSwapPairABI from './abi/pancake_swap_pair.json';

import ADDRESSES from './addresses.js';
import CONFIG from './config.js';

const provider = new ethers.providers.JsonRpcProvider(CONFIG.PROVIDER_URL);
const wallet = new ethers.Wallet(CONFIG.MNEMONIC, provider);
const account = wallet.connect(provider);

const pancakeSwapRouterContract = new ethers.Contract(ADDRESSES.ROUTER, PancakeSwapRouterV2ABI, account);
const pancakeSwapFactoryContract = new ethers.Contract(ADDRESSES.FACTORY, PancakeSwapFactoryABI, account);

const createTokenContract = (tokenAddress) => new ethers.Contract(tokenAddress, PancakeSwapPairABI, account);

const getPairContract = async (token0, token1) => {
    const pairAddress = await pancakeSwapFactoryContract.getPair(token0, token1);
    if (pairAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Pair not found');
    }
    return new ethers.Contract(pairAddress, PancakeSwapPairABI, account);
}

const checkTokenIsApproved = async (tokenAddress, amount) => {
    const tokenContract = createTokenContract(tokenAddress);
    const approved = await tokenContract.allowance(wallet.address, ADDRESSES.ROUTER);

    const amountApproved = parseFloat(ethers.utils.formatEther(approved));

    if (amount > amountApproved) {
        console.log('Valor não aprovado para swap.');
        console.log('Aprovando token...');
        const tx = await tokenContract.approve(ADDRESSES.ROUTER, ethers.utils.parseEther('1000000000000'));
        const receipt = await tx.wait();
        console.log('Token aprovado: ', receipt.transactionHash);
    }
}

const getTokenPrice = async (token0, token1) => {
    const pairContract = await getPairContract(token0, token1);
    const reserves = await pairContract.getReserves();
    const reserve0 = ethers.utils.formatEther(reserves[0]);
    const reserve1  = ethers.utils.formatEther(reserves[1]);
    return [
        reserve0/reserve1,
        reserve1/reserve0,
    ];
}

const showTokensPrice = async (token0, token1) => {
    const token0Contract = await createTokenContract(token0);
    const token1Contract = await createTokenContract(token1);

    const token0Name = await token0Contract.symbol();
    const token1Name = await token1Contract.symbol();

    const [price, priceInvert] = await getTokenPrice(token0, token1);

    console.log(`
        Price:
        1 ${token0Name} => ${priceInvert} ${token1Name}
        1 ${token1Name} => ${price} ${token0Name}
    `);
}

const getAmountTokenCanBuy = async (amount, token0, token1) => {
    const buyAmountFormatted = ethers.utils.parseEther(amount.toString());
    try {
        const amounts = await pancakeSwapRouterContract.getAmountsOut(buyAmountFormatted, [token0, token1]);
        return ethers.utils.formatEther(amounts[1]);
    } catch (e) {
        console.error(`
            Não foi possível determinar a quantidade de token a comprar. 
            Provaveis motivos:
                Ainda não foi adicionada liquidez ao par.
        `)
        return 0;
    }
}

const getBalance = async (token) => {
    const tokenAddress = createTokenContract(token);
    const balance = await tokenAddress.balanceOf(account.address);
    return ethers.utils.formatEther(balance);
}

const estimateGasToSwap = async (amount, minAmountToReceived, token0, token1) => {
    const estimateGas = await pancakeSwapRouterContract.estimateGas.swapExactTokensForTokens(
        ethers.utils.parseEther(amount.toString()),
        minAmountToReceived,
        [token0, token1],
        wallet.address,
        Date.now() + 1000 * 60 * 10,
    );
    return ethers.utils.formatEther(estimateGas);
}

const swapTokens = async (amount, minAmountToReceived, token0, token1) => {
    const tx = await pancakeSwapRouterContract.swapExactTokensForTokens(
        ethers.utils.parseEther(amount.toString()),
        minAmountToReceived,
        [token0, token1],
        wallet.address,
        Date.now() + 1000 * 60 * 10,
    );
    return await tx.wait();
}

const calcSlippage = (amountOut) => {
    const calcSlippagePercent = amountOut - ((amountOut/100)*CONFIG.SLIPPAGE_VALUE);
    return [
        calcSlippagePercent,
        ethers.utils.parseEther(calcSlippagePercent.toString()),
    ];
}

const getMinAmountToReceive = async () => {
    let tokenToReceiveForHumans = CONFIG.SLIPPAGE_VALUE;
    let minAmountToReceived = ethers.utils.parseEther(CONFIG.SLIPPAGE_VALUE.toString());

    if (CONFIG.SLIPPAGE_TYPE !== 'absolute') {
        console.log('Calculando tokens a receber..');
        const amountMinFromContract = await getAmountTokenCanBuy(CONFIG.AMOUNT_BUY, CONFIG.INPUT_TOKEN_ADDRESS, CONFIG.OUTPUT_TOKEN_ADDRESS);
        const amountAfterSlippage = calcSlippage(amountMinFromContract);
        tokenToReceiveForHumans = amountAfterSlippage[0];
        minAmountToReceived = amountAfterSlippage[1];
    }

    console.log(`Com ${CONFIG.AMOUNT_BUY} a transação tentará receber no mínimo: `, tokenToReceiveForHumans);
    return minAmountToReceived;
}

let bought = false;

const runJobSwap = async () => {
    let minAmountToReceived = await getMinAmountToReceive();

    if (minAmountToReceived > 0 && CONFIG.ENABLE_SWAP) {
        if (CONFIG.CHECK_GAS) {
            console.log('Calculando taxa de gas...');
            const estimateGas = await estimateGasToSwap(CONFIG.AMOUNT_BUY, minAmountToReceived, CONFIG.INPUT_TOKEN_ADDRESS, CONFIG.OUTPUT_TOKEN_ADDRESS);
            console.log('Gas estimado: ', estimateGas);
        }

        console.log('Swapping tokens...');
        bought = true;
        const receipt = await swapTokens(CONFIG.AMOUNT_BUY, minAmountToReceived, CONFIG.INPUT_TOKEN_ADDRESS, CONFIG.OUTPUT_TOKEN_ADDRESS);
        console.log('Swapped: ', receipt.transactionHash);
    }
}

const main = async () => {
    if (CONFIG.SHOW_TOKENS_PRICE) {
        await showTokensPrice(CONFIG.INPUT_TOKEN_ADDRESS, CONFIG.OUTPUT_TOKEN_ADDRESS);
    }

    if (CONFIG.CHECK_TOKEN_APPROVED) {
        await checkTokenIsApproved(CONFIG.INPUT_TOKEN_ADDRESS, 1000);
    }

    if (CONFIG.CHECK_BALANCE) {
        console.log('Checando saldo...');
        const walletBalance = await getBalance(CONFIG.INPUT_TOKEN_ADDRESS);
        console.log(`Saldo: ${walletBalance}`);
        if (CONFIG.AMOUNT_BUY > walletBalance) {
            return console.error('Saldo insuficiente para realizar a compra');
        }
    }

    const pairContract = await getPairContract(CONFIG.INPUT_TOKEN_ADDRESS, CONFIG.OUTPUT_TOKEN_ADDRESS);
    console.log(`Pair contract: ${pairContract.address}`);

    while (!bought) {
        await runJobSwap();
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}

void main();
