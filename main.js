const net = require('net');
const sqlite3 = require('sqlite3').verbose();
const colors = require('colors');

// Configuración de la base de datos SQLite
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    process.exit(1);
  } else {
    console.log('Conectado a la base de datos.');

    // Crea la tabla de usuarios si no existe
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error al crear la tabla de usuarios:', err);
      } else {
        console.log('Tabla de usuarios creada o ya existe.');
      }
    });
  }
});

// Configuración del servidor TCP
const server = net.createServer((socket) => {
  console.log('Nuevo cliente conectado.');
  let isLoggedIn = false;
  let username = null;

  socket.on('data', (data) => {
    const message = data.toString().trim();

    // Procesa el mensaje del cliente
    const parts = message.split(' ');
    const command = parts[0];

    switch (command) {
      case 'register':
        handleRegister(socket, parts);
        break;
      case 'login':
        handleLogin(socket, parts);
        break;
      case 'exit':
        socket.write('¡Hasta luego!');
        socket.end();
        break;
      default:
        if (isLoggedIn) {
          handleCommand(socket, parts);
        } else {
          socket.write(colors.red('Debes iniciar sesión primero.'));
        }
        break;
    }

    // Promptear al usuario para ingresar un comando
    socket.write(colors.yellow('\ncomando: '));
  });

  socket.on('close', () => {
    console.log('Cliente desconectado.');
  });

  socket.on('error', (err) => {
    console.error('Error del socket:', err);
  });

  // Función para manejar el registro de usuarios
  const handleRegister = (socket, parts) => {
    const username = parts[1];
    const password = parts[2];

    // Verifica si el nombre de usuario ya existe
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) {
        socket.write(colors.red('Error al verificar el nombre de usuario.'));
      } else if (row) {
        socket.write(colors.red('Nombre de usuario ya existe.'));
      } else {
        // Registra al usuario
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], (err) => {
          if (err) {
            socket.write(colors.red('Error al registrar usuario.'));
          } else {
            socket.write(colors.green('Usuario registrado.'));
          }
        });
      }
    });
  };

  // Función para manejar el inicio de sesión
  const handleLogin = (socket, parts) => {
    const username = parts[1];
    const password = parts[2];

    // Verifica si el usuario existe y la contraseña es correcta
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) {
        socket.write(colors.red('Error al verificar las credenciales.'));
      } else if (!row || row.password !== password) {
        socket.write(colors.red('Nombre de usuario o contraseña incorrectos.'));
      } else {
        // Inicia sesión al usuario
        isLoggedIn = true;
        this.username = username;
        socket.write(colors.green(`¡Bienvenido, ${username}!`));
      }
    });
  };

  const handleCommand = (socket, parts) => {
    // Ejemplo de un comando simple:
    const command = parts[0];
    if (command === 'whoami') {
      socket.write(colors.yellow(`Eres: ${username}`));
    } else {
      socket.write(colors.red('Comando inválido.'));
    }
  };
});

// Escucha el puerto 3000
server.listen(3000, () => {
  console.log('Servidor TCP escuchando en el puerto 3000.');
});

// Cierra la conexión a la base de datos al finalizar el servidor
server.on('close', () => {
  db.close((err) => {
    if (err) {
      console.error('Error al cerrar la conexión a la base de datos:', err);
    } else {
      console.log('Conexión a la base de datos cerrada.');
    }
  });
});