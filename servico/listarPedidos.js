// servico/listarPedidos.js

import pool from './conexao.js';

export async function listarPedidosAdmin(req, res) {
  try {
    const { filtro } = req.query;

    const query = `
      SELECT 
        p.id_pedido,
        p.data_criacao,
        c.id_cliente,
        c.email AS email_cliente,
        c.nome_completo,
        p.valor_total,
        p.forma_pagamento,
        p.status,
        pi.id_pedido_ingrediente, 
        i.tipo,
        i.nome AS nome_ingrediente,
        pi.quantidade,
        e.rua, 
        e.numero, 
        e.bairro, 
        e.cep, 
        e.complemento
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      LEFT JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
      WHERE p.status = ?
      ORDER BY p.id_pedido, pi.id_pedido_ingrediente -- Adicionado ordenação por id_pedido_ingrediente para ajudar no agrupamento
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    const pedidosAgrupados = new Map();

    for (const row of rows) {
      const pedidoId = row.id_pedido;

      if (!pedidosAgrupados.has(pedidoId)) {
        pedidosAgrupados.set(pedidoId, {
          id_pedido: pedidoId,
          data_criacao: row.data_criacao,
          id_cliente: row.id_cliente,
          email_cliente: row.email_cliente,
          nome_completo: row.nome_completo,
          valor_total: parseFloat(row.valor_total || 0),
          forma_pagamento: row.forma_pagamento,
          status: row.status,
          rua: row.rua,
          numero: row.numero,
          bairro: row.bairro,
          cep: row.cep,
          complemento: row.complemento,
          _cupcakesTemp: new Map() 
        });
      }

      const pedido = pedidosAgrupados.get(pedidoId);

      if (row.id_pedido_ingrediente && row.tipo && row.nome_ingrediente) {
        let cupcakeEncontrado = Array.from(pedido._cupcakesTemp.values()).find(c => 
            c.quantidade === row.quantidade &&
            (c.tamanho === null || c.recheio === null || c.cobertura === null || c.cor_cobertura === null)
        );

        if (!cupcakeEncontrado) {
            cupcakeEncontrado = {
                tamanho: null,
                recheio: null,
                cobertura: null,
                cor_cobertura: null,
                quantidade: row.quantidade 
            };
            pedido._cupcakesTemp.set(row.id_pedido_ingrediente, cupcakeEncontrado); 
        }

        if (row.tipo && row.nome_ingrediente) {
            cupcakeEncontrado[row.tipo] = row.nome_ingrediente;
        }
      }
    }

    const pedidosFormatados = Array.from(pedidosAgrupados.values()).map(pedido => {
      const data = new Date(pedido.data_criacao);

      const cupcakesArray = Array.from(pedido._cupcakesTemp.values());

      delete pedido._cupcakesTemp;
      
      const cupcakesValidos = cupcakesArray.filter(cp => 
        cp.tamanho || cp.recheio || cp.cobertura || cp.cor_cobertura || cp.quantidade > 0
      );

      return {
        ...pedido,
        data_criacao: data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        cupcakes: cupcakesValidos.length > 0 ? cupcakesValidos : (pedido.valor_total > 0 ? [{
            tamanho: null,
            recheio: null,
            cobertura: null,
            cor_cobertura: null,
            quantidade: null
        }] : [])
      };
    });

    res.json(pedidosFormatados);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
}