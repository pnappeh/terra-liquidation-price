const assert = require('assert');
const WebSocket = require('ws');
const util = require('util');

const ws = new WebSocket('wss://observer.terra.dev');

let bLunaPrice;
let liquidationPrice;


ws.onopen = function () {
    console.log('connected to websocket. subscribing...')
    // subscribe to new_block events
    ws.send(JSON.stringify({subscribe: "new_block", chain_id: "columbus-4"}));

    ws.onmessage = function (message) {
        const data = JSON.parse(message.data);
       
        if(data) {
            console.log("Retrieves Block");
        } else {
            console.log("Does not retrieve block")
        }

        const transactions = data.data.txs;
        
        if(transactions) {
            console.log("Retrieves transactions")
        } else {
            console.log("Does not retrieve transactions")
        }

        try {
            transactions.forEach( transaction => {
                
                transaction.logs.forEach( log => {
                    const logEvents = log.events;
                    let borrow_stable;
                    let borrower;
                    let borrow_amount;
                    let exchange_rates;
                    let bLunaDeposited;

                    logEvents.forEach(async logEvent => {
                        
                        if (logEvent.type === 'aggregate_vote') {
                            const RatesAttributes = logEvent.attributes;
                            
                            RatesAttributes.forEach( RateAttribute => {
                                if (RateAttribute.key === 'exchange_rates') {
                                    exchange_rates = RateAttribute.value;
                                    const prices = exchange_rates.split(",");

                                    prices.forEach( price => {
                                        if (price.slice(-4) === 'uusd') {
                                            bLunaPrice = price.slice(0, -4);
                                        } 
                                    });
                                }
                            });
                        }

                        if(logEvent.type == 'from_contract') {
                            
                            if (!logEvent.attributes) {
                                return false;
                            }

                            logEvent.attributes.forEach( attribute => {
                                
                                if (attribute.key === "borrower") {
                                    borrower = attribute.value;
                                }

                                if (attribute.key === "borrow_amount") {
                                    borrow_amount = attribute.value;
                                }               

                                if (attribute.key === "action" && attribute.value === "deposit_collateral") {
                                    bLunaDeposited = logEvent.attributes.slice(-1)[0].value;
                                }

                                if(attribute.key === 'action' && attribute.value === 'borrow_stable') {
                                    borrow_stable = true;
                                }

                                if(borrower && borrow_amount && borrow_stable) {

                                    if(bLunaPrice) {
                                        console.log("retrieves bLunaPrice")
                                    } else {
                                        console.log("does not retrieves bLunaPrice")
                                    }
                                    
                                    if(borrow_stable) {
                                        console.log("retrieves borrow stable")
                                    } else {
                                        console.log("does not retrieves borrow stable")
                                    }
                
                                    if (borrower) {
                                        console.log("retrieves borrower account")
                                    } else {
                                        console.log("does not retrieves borrower account")
                                    }
                
                                    if(borrow_amount > 0) {
                                        console.log("retrieves borrow amount")
                                    } else {
                                        console.log("does not retrieves borrow amount")
                                    }
                
                                    if (bLunaDeposited) {
                                        console.log("retrieves bLunaDeposited")
                                    } else {
                                        bLunaDeposited
                                    }
                
                                    if(liquidationPrice) {
                                        console.log("calculates liquidation price")
                                    } else {
                                        console.log("does not calculate liquidation price")
                                    }
                                
                                }
                            });
                        }
                    });       
                });     
            });

        } catch (err) {
            console.log("Error occured");
        }
    }
}


    
