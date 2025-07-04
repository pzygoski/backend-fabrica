// Arquivo: Sua API (por exemplo, pedidosController.js ou onde você tem listarPedidosAdmin)
import pool from './conexao.js'; // Certifique-se de que o caminho está correto

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
        pi.id_pedido_ingrediente, -- Adicionado para ajudar no agrupamento
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
      ORDER BY p.id_pedido, pi.id_pedido_ingrediente -- Ordenar por pedido e ingrediente para agrupamento
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    const pedidosAgrupados = new Map();

    for (const row of rows) {
      const pedidoId = row.id_pedido;

      if (!pedidosAgrupados.has(pedidoId)) {
        pedidosAgrupados.set(pedidoId, {
          id_pedido: row.id_pedido,
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
          cupcakes: []
        });
      }

      const pedido = pedidosAgrupados.get(pedidoId);

      // Lógica para agrupar ingredientes em cupcakes
      // A suposição aqui é que cada 'quantidade' na tabela pedido_ingredientes
      // representa um "slot" de cupcake ou que múltiplos ingredientes se combinam para um cupcake.
      // A abordagem mais robusta exigiria um id_cupcake na tabela pedido_ingredientes.

      // Vamos agrupar os ingredientes por id_pedido_ingrediente se você espera que cada
      // entrada em pedido_ingredientes seja um ingrediente de um cupcake separado.
      // Se um cupcake tem MULTIPLOS ingredientes (tamanho, recheio, cobertura, cor),
      // então a lógica abaixo precisaria ser mais sofisticada.

      // Para a estrutura atual, o mais provável é que um pedido possa ter vários
      // "cupcakes" e cada "cupcake" é composto por um conjunto de ingredientes.
      // Vamos tentar agrupar ingredientes que são parte do mesmo cupcake.
      // A forma mais simples de fazer isso sem um id_cupcake explícito
      // é agrupar os ingredientes com a mesma `quantidade` dentro do pedido.
      // MAS ISSO É UM HACK.

      // A solução mais robusta, sem alterar o DB, é: cada linha da query representa um par (pedido, ingrediente).
      // Se um pedido tem N cupcakes, e cada cupcake tem 4 ingredientes, você terá 4*N linhas para aquele pedido.
      // Precisamos inferir os cupcakes a partir dessas linhas.

      if (row.tipo && row.nome_ingrediente) {
        // Encontra o último cupcake adicionado. Se ele ainda não tem todos os ingredientes ou
        // se a quantidade de ingredientes para esse cupcake ainda não foi preenchida, adiciona nele.
        // Isso é uma heurística e pode falhar se os pedidos forem muito complexos.

        let lastCupcake = pedido.cupcakes[pedido.cupcakes.length - 1];

        // Se o último cupcake está "completo" ou não existe, crie um novo.
        // Um cupcake está "completo" se ele tem tamanho, recheio, cobertura e cor_cobertura.
        // A 'quantidade' da tabela 'pedido_ingredientes' indica quantos *daquele ingrediente* foram pedidos.
        // Se a quantidade é a mesma para um conjunto de ingredientes (tamanho, recheio, cobertura, cor),
        // isso sugere que eles pertencem ao mesmo cupcake.

        // Para simular a criação de cupcakes sem um ID de cupcake explícito:
        // Crie um novo objeto de cupcake para cada conjunto de 4 ingredientes (tamanho, recheio, cobertura, cor_cobertura)
        // que aparecem juntos. Isso é **muito dependente da ordem e da integridade dos dados**.
        // A 'quantidade' na tabela 'pedido_ingredientes' se refere à quantidade daquele *ingrediente*
        // e não à quantidade de cupcakes. Assumimos que `pi.quantidade` representa a quantidade
        // de cupcakes que usam aquele ingrediente específico.

        const quantidadeDoIngrediente = row.quantidade;

        // Tenta encontrar um cupcake existente que ainda está "em construção"
        // (faltando algum tipo de ingrediente e com a mesma quantidade)
        let cupcakeEncontrado = pedido.cupcakes.find(cp =>
          (cp.tamanho === null || cp.recheio === null || cp.cobertura === null || cp.cor_cobertura === null) &&
          (cp.quantidade === undefined || cp.quantidade === quantidadeDoIngrediente) // Tentativa de agrupar pela quantidade
        );

        if (!cupcakeEncontrado) {
          // Se não encontrou ou o encontrado já está "completo" (tem todos os tipos de ingredientes),
          // cria um novo cupcake.
          cupcakeEncontrado = {
            tamanho: null,
            recheio: null,
            cobertura: null,
            cor_cobertura: null,
            quantidade: quantidadeDoIngrediente // Assume que a quantidade de um ingrediente é a quantidade do cupcake
          };
          pedido.cupcakes.push(cupcakeEncontrado);
        }
        
        // Garante que a quantidade do cupcake seja a quantidade do ingrediente atual
        cupcakeEncontrado.quantidade = quantidadeDoIngrediente;

        // Atribui o ingrediente ao campo correto do cupcake
        cupcakeEncontrado[row.tipo] = row.nome_ingrediente;
      }
    }

    const pedidosFormatados = Array.from(pedidosAgrupados.values()).map(pedido => {
      const data = new Date(pedido.data_criacao);

      // Filtra cupcakes que podem ter sido criados mas não totalmente preenchidos
      // por falta de dados na query (e.g., um pedido sem nenhum ingrediente)
      const cupcakesValidos = pedido.cupcakes.filter(cp => 
          cp.tamanho || cp.recheio || cp.cobertura || cp.cor_cobertura
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
        cupcakes: cupcakesValidos
      };
    });

    // Agrupa os pedidos por email do cliente na camada de apresentação (React)
    // O React já faz isso, então a API deve retornar todos os pedidos.
    // A lógica de agrupar por email do cliente no frontend é mais flexível.

    res.json(pedidosFormatados);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
}