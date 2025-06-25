import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './servico/conexao.js';
import { cadastrarCliente } from './servico/cadastrarClientes.js';
import { listarClientes } from './servico/listarClientes.js';
import { loginCliente } from './servico/loginClientes.js';
import { listarPedidosAdmin } from './servico/listarPedidos.js';
import { atualizarStatusPedido } from './servico/atualizarStatus.js';
import { relatorioPedidos } from './servico/relatorio.js';
import { excluirPedidoCarrinho } from './servico/excluirPedidoCarrinho.js';
import { adicionarAoCarrinho } from './servico/adicionarAoCarrinho.js';
import { listarCarrinho } from './servico/listarCarrinho.js';


dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/clientes', listarClientes);
app.post('/cadastrarCliente', cadastrarCliente);
app.post('/login', loginCliente);

app.get('/admin/pedidos', listarPedidosAdmin);
app.put('/admin/pedidos/:id', atualizarStatusPedido);

app.get('/relatorio', relatorioPedidos);

app.post('/adicionarAoCarrinho', adicionarAoCarrinho);
app.delete('/excluirPedidoCarrinho/:id', excluirPedidoCarrinho);
app.get('/carrinho/:id_cliente', listarCarrinho);


app.listen(9000, () => {
    console.log(`Servidor rodando em http://localhost:9000`);
});
