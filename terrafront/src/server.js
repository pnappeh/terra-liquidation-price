const WebSocket = require('ws');
const util = require('util');

//const wss = new WebSocket.Server({ port: 3030 });

const ws = new WebSocket('wss://observer.terra.dev');

/*wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(data) {
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});*/
let bLunaPrice;
let liquidationPrice;

const terraBackend = ws.onopen = function () {
	console.log('connected to websocket. subscribing...')
    // subscribe to new_block events
    ws.send(JSON.stringify({subscribe: "new_block", chain_id: "columbus-4"}));

    ws.onmessage = async function (message) {
        /* process messages here */
        const data = await JSON.parse(message.data);
        //const block = await data.block;
        
        const transactions = await data.data.txs;
        
        try {
        transactions.forEach( transaction => {
            
            transaction.logs.forEach( log => {
                const logEvents = log.events;
                let borrow_stable;
                let borrower;
                let borrow_amount;
                let exchange_rates;

                logEvents.forEach(async logEvent => {
                    //console.log(logEvent.type); return;
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
                                //console.log(util.inspect(exchange_rates, false, null, true /* enable colors */))
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

                            if(attribute.key === 'action' && attribute.value === 'borrow_stable') {
                                borrow_stable = true;
                            }

                            if(borrower && borrow_amount && borrow_stable) {
                                console.log("borrower: " + borrower + " | borrow_amount: " + borrow_amount);
                                console.log("bLunaPrice: " + bLunaPrice);  
                                //liquidationPrice = borrow_amount / ()  
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

    ws.onclose = function(e) {
        console.log('websocket closed. reopening...');
        setTimeout(function() {
            main();
        }, 1000);
    };
};
