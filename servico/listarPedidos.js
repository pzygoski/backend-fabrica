import pool from './conexao.js';

export async function listarPedidosAdmin(req, res) {
    try {
        const { filtro } = req.query; // Pode ser 'aguardando' ou 'finalizados'
        
        let query = `
            SELECT 
                p.id_pedido, 
                p.data_criacao, 
                c.email AS email_cliente, 
                p.valor_total, 
                p.forma_pagamento, 
                p.status,
                MAX(CASE WHEN i.tipo = 'tamanho' THEN i.nome END) AS tamanho,
                MAX(CASE WHEN i.tipo = 'recheio' THEN i.nome END) AS recheio,
                MAX(CASE WHEN i.tipo = 'cobertura' THEN i.nome END) AS cobertura,
                MAX(CASE WHEN i.tipo = 'cor_cobertura' THEN i.nome END) AS cor_cobertura,
                e.rua, 
                e.numero, 
                e.bairro, 
                e.cep, 
                e.complemento
            FROM pedidos p
            JOIN clientes c ON p.id_cliente = c.id_cliente
            JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
            JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
            LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
            WHERE p.status = 'aguardando'
        `;

        if (filtro === 'finalizados') {
            query = `
                SELECT 
                    p.id_pedido, 
                    p.data_criacao, 
                    c.email AS email_cliente, 
                    p.valor_total, 
                    p.forma_pagamento, 
                    p.status,
                    MAX(CASE WHEN i.tipo = 'tamanho' THEN i.nome END) AS tamanho,
                    MAX(CASE WHEN i.tipo = 'recheio' THEN i.nome END) AS recheio,
                    MAX(CASE WHEN i.tipo = 'cobertura' THEN i.nome END) AS cobertura,
                    MAX(CASE WHEN i.tipo = 'cor_cobertura' THEN i.nome END) AS cor_cobertura,
                    e.rua, 
                    e.numero, 
                    e.bairro, 
                    e.cep, 
                    e.complemento
                FROM pedidos p
                JOIN clientes c ON p.id_cliente = c.id_cliente
                JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
                JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
                LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
                WHERE p.status = 'finalizado' AND p.data_criacao >= NOW() - INTERVAL 1 DAY
                GROUP BY p.id_pedido, e.rua, e.numero, e.bairro, e.cep, e.complemento
            `;
        } else {
            query += ` GROUP BY p.id_pedido, e.rua, e.numero, e.bairro, e.cep, e.complemento`;
        }

        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
    }
}
