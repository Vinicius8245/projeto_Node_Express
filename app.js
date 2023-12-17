const express = require('express');
const session = require('express-session');
const app = express();
const formidable = require('formidable');
const fs = require('fs');
const PORT = 3000;
const connection = require('./db');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const auth = require('./authMiddleware');

app.set('view engine', 'ejs');
app.use(session({
  secret: '2C44-4D44-WppQ38S',
  resave: false,
  saveUninitialized: true
}));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ROTAS GET
app.get('/', (req, res) => {
  const { nome, fotoPerfil } = req.session.user || {}; 
  res.render('index', { user: { nome, fotoPerfil } }); 
});
app.get('/cadastro', (req, res) => {
  const { nome, fotoPerfil } = req.session.user || {};
  res.render('cadastro', { user: { nome, fotoPerfil } }); 
});
app.get('/login', (req, res) => {
  const { nome, fotoPerfil } = req.session.user || {};
  res.render('login', { error: null, user: { nome, fotoPerfil } });
});
app.get('/vender', auth.isAuthenticated , (req, res) => {
  const { nome, fotoPerfil } = req.session.user || {};
  res.render('vender', { user: { nome, fotoPerfil } }); 
});
app.get('/visualizarCarros',auth.isAuthenticated , (req, res) => {
  connection.query('SELECT id, nome, modelo, ano, valor, imagem FROM node_carros', (error, results) => {
    if (error) {
      console.error('Erro ao obter carros:', error);
      return res.status(500).send('Erro ao obter carros disponíveis.');
    }
    res.render('visualizarCarros', { carros: results });
  });
});
app.get('/editarForm/:id',auth.isAuthenticated , (req, res) => {
  const carroId = req.params.id;
  connection.query('SELECT id, nome, modelo, ano, valor,cor, imagem FROM node_carros WHERE id = ?', [carroId], (error, results) => {
    if (error) {
      console.error('Erro ao buscar informações do carro:', error);
      return res.status(500).send('Erro ao buscar informações do carro.');
    }
    if (results.length === 0) {
      return res.status(404).send('Carro não encontrado.');
    }
    const carro = results[0];
    res.render('editarForm', { carro });
  });
});



// ROTAS POST
app.post('/cadastro', (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Erro no upload de arquivo:', err);
      return res.status(500).json({ error: 'Erro no upload de arquivo.' });
    }

    const nome = fields.nome;
    const senha = Array.isArray(fields.senha) ? fields.senha[0] : fields.senha;
    const email = fields.email;
    const fotoPerfilFile = files.fotoPerfil;
    const oldpath = files.fotoPerfil[0].filepath;
    const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
    const ext = path.extname(files.fotoPerfil[0].originalFilename);
    const nomeimg = hash + ext;

    bcrypt.hash(senha, 10, (err, hashSenha) => {
      if (err) {
        console.error('Erro ao criptografar a senha:', err);
        return res.status(500).json({ error: 'Erro ao criptografar a senha.' });
      }
      const newpath = path.join(__dirname, 'public/img/', nomeimg);

      fs.copyFile(oldpath, newpath, (err) => {
        if (err) {
          console.error('Erro ao copiar o arquivo:', err);
          return res.status(500).json({ error: 'Erro ao mover o arquivo.' });
        }

        fs.unlink(oldpath, (err) => {
          if (err) {
            console.error('Erro ao excluir o arquivo temporário:', err);
            return res.status(500).json({ error: 'Erro ao mover o arquivo.' });
          }

          const sql = 'INSERT INTO usuarios (nome, senha, email, fotoPerfil) VALUES (?, ?, ?, ?)';
          const values = [nome, hashSenha, email, nomeimg];
          connection.query(sql, values, (error, results) => {
            if (error) {
              console.error('Erro ao salvar no banco de dados:', error);
              return res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
            }
            return res.status(200).json({ message: 'Cadastro realizado com sucesso!' });
          });
        });
      });
    });
  });
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM usuarios WHERE nome = ?';
  connection.query(sql, [username], (error, results) => {
    if (error) {
      console.error('Erro ao buscar usuário:', error);
      return res.render('login', { error: 'Erro ao buscar usuário. Tente novamente.' });
    }
    if (results.length === 0) {
      return res.render('login', { error: 'Usuário não encontrado.' });
    }
    const user = results[0];
    bcrypt.compare(password, user.senha, (err, result) => {
      if (err) {
        console.error('Erro ao comparar senhas:', err);
        return res.render('login', { error: 'Erro ao comparar senhas. Tente novamente.' });
      }

      if (result) {
        req.session.user = user;
        return res.redirect('/');
      } else {
        return res.render('login', { error: 'Credenciais inválidas.' });
      }

    });
  });
});
app.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Erro ao encerrar a sessão:', err);
        return res.status(500).json({ error: 'Erro ao encerrar a sessão.' });
      }
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});
app.post('/vender', (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Erro no upload de arquivo:', err);
      return res.status(500).json({ error: 'Erro no upload de arquivo.' });
    }

    const nome = fields.nome;
    const modelo = fields.modelo;
    const ano = fields.ano;
    const valor = fields.valor;
    const cor = fields.cor;

    const oldpath = files.fotoPerfil[0].filepath;
    const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
    const ext = path.extname(files.fotoPerfil[0].originalFilename);
    const nomeimg = hash + ext;

    const newpath = path.join(__dirname, 'public/img/', nomeimg);

    fs.copyFile(oldpath, newpath, (err) => {
      if (err) {
        console.error('Erro ao copiar o arquivo:', err);
        return res.status(500).json({ error: 'Erro ao mover o arquivo.' });
      }

      fs.unlink(oldpath, (err) => {
        if (err) {
          console.error('Erro ao excluir o arquivo temporário:', err);
          return res.status(500).json({ error: 'Erro ao mover o arquivo.' });
        }

        const sql = 'INSERT INTO node_carros (nome, modelo, cor, ano, valor, imagem) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [nome, modelo, cor, ano, valor, nomeimg];
        connection.query(sql, values, (error, results) => {
          if (error) {
            console.error('Erro ao salvar no banco de dados:', error);
            return res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
          }
          res.redirect('/visualizarCarros');
        });
      });
    });
  });
});
app.post('/editarForm/:id', (req, res) => {
  const carroId = req.params.id;
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Erro no upload de arquivo:', err);
      return res.status(500).json({ error: 'Erro no upload de arquivo.' });
    }

    const { nome, modelo, valor, ano, cor, imagemAtual } = fields;

    let imagem = imagemAtual;

    if (files && files.imagem && files.imagem.length > 0) {
      const oldpath = files.imagem[0].filepath;
      const ext = path.extname(files.imagem[0].originalFilename);
      const hash = crypto.createHash('md5').update(Date.now().toString()).digest('hex');
      const nomeimg = hash + ext;
      const newpath = path.join(__dirname, 'public/img/', nomeimg);

      fs.copyFile(oldpath, newpath, (err) => {
        if (err) {
          console.error('Erro ao copiar o arquivo:', err);
          return res.status(500).json({ error: 'Erro ao mover o arquivo.' });
        }
        imagem = nomeimg;

        fs.unlink(oldpath, (err) => {
          if (err) {
            console.error('Erro ao excluir o arquivo temporário:', err);
            return res.status(500).json({ error: 'Erro ao mover o arquivo.' });
          }

          updateCarro();
        });
      });
    } else {
      updateCarro();
    }

    function updateCarro() {
      const sql = 'UPDATE node_carros SET nome = ?, modelo = ?, valor = ?, ano = ?, cor = ?, imagem = ? WHERE id = ?';
      const values = [nome, modelo, valor, ano, cor, imagem, carroId];

      connection.query(sql, values, (error, results) => {
        if (error) {
          console.error('Erro ao atualizar informações do carro:', error);
          return res.status(500).send('Erro ao atualizar informações do carro.');
        }
        res.redirect('/visualizarCarros');
      });
    }
  });
});


//ROTAS DELETE
app.delete('/visualizarCarros/:id', (req, res) => {
  const carroId = req.params.id;
  connection.query('SELECT imagem FROM node_carros WHERE id = ?', [carroId], (error, results) => {
    if (error) {
      console.error('Erro ao buscar o nome do arquivo:', error);
      return res.status(500).json({ error: 'Erro ao buscar o nome do arquivo.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Carro não encontrado.' });
    }

    const nomeArquivo = results[0].imagem;
    const caminhoArquivo = path.join(__dirname, 'public/img/', nomeArquivo);
    
    connection.query('DELETE FROM node_carros WHERE id = ?', [carroId], (error) => {
      if (error) {
        console.error('Erro ao excluir do banco de dados:', error);
        return res.status(500).json({ error: 'Erro ao excluir do banco de dados.' });
      }
      fs.unlink(caminhoArquivo, (err) => {
        if (err) {
          console.error('Erro ao excluir o arquivo do repositório:', err);
          return res.status(500).json({ error: 'Erro ao excluir o arquivo do repositório.' });
        }
        return res.status(200).json({ message: 'Exclusão realizada com sucesso!' });
      });
    });
  });
});

//SERVIDOR
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
app.use(express.static('public'));
