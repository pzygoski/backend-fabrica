import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import pool from './conexao.js';

export async function cadastrarCliente(req, res) {
    try {
        const {email, senha, cpf} = req.body;

        const [emailExistente] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);
        if (emailExistente.length > 0) {
            return res.status(400).json({ mensagem: 'Esse e-mail já foi cadastrado, tente outro ou faça o login!'})
        }
        
        const [cpfExistente] = await pool.query('SELECT * FROM clientes WHERE cpf = ?', [cpf])
        if (cpfExistente.length > 0) {
            return res.status(400).json({ mensagem: 'Esse cpf ja foi cadastrado, tente outro!'})
        }

        const senhaHash = await bcrypt.hash(senha, 10)
        await pool.query('INSERT INTO clientes (email, senha, cpf) VALUES (?, ?, ?)', [email, senhaHash, cpf]);
        
        res.status(201).json({ mensagem: 'Conta criada com sucesso!' })
    } catch (error){
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao criar a conta!'})
    }
}