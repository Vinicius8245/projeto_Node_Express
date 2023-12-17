const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nodeCarros'
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar:', err);
    return;
  }
  console.log('Conexão estabelecida com o servidor MySQL.');

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS node_carros (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      modelo VARCHAR(255) NOT NULL,
      cor VARCHAR(255) NOT NULL,
      ano INT NOT NULL,
      valor INT NOT NULL,
      imagem VARCHAR(255)
    )
  `;

  connection.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Erro ao criar a tabela:', err);
      return;
    }
    console.log('Tabela criada com sucesso!');
  });

  const createUsuariosTableQuery = `
    CREATE TABLE IF NOT EXISTS Usuarios (
      ID INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      senha VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      fotoPerfil VARCHAR(255) DEFAULT 'default.jpg' 
    )
  `;
  connection.query(createUsuariosTableQuery, (err, result) => {
    if (err) {
      console.error('Erro ao criar a tabela de usuários:', err);
      return;
    }
    console.log('Tabela de usuários criada com sucesso!');
  });
});
module.exports = connection;
