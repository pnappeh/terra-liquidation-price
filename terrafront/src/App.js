import React, { Component } from 'react';
import { w3cwebsocket as W3CWebSocket } from "websocket";

const client = new W3CWebSocket('ws://127.0.0.1:8000');
//const contentDefaultMessage = "Start writing your document here";

class App extends Component {
  state = {
    bLunaPrice: []
  }

  componentWillMount() {
    client.onopen = () => {
      console.log('WebSocket Client Connected');
    };
    client.onmessage = (message) => {
      console.log(message);
      this.setState({ bLunaPrice: [this.state.bLunaPrice, message.data]});
    };
  }
  
  render() {
    return (
      <React.Fragment>
        <div className="container-fluid">
          <p>{this.state.bLunaPrice}</p>
        </div>
      </React.Fragment>
    );
  }
}

export default App;