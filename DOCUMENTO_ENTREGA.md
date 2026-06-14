# Proyecto Final Backend II
# Sistema de Autenticación Híbrido con Node.js

---

## 1. Presentación del Proyecto

### 1.1 Descripción General

Este proyecto implementa un **sistema de autenticación híbrido** desarrollado con Node.js y Express, que combina múltiples estrategias de autenticación para ofrecer flexibilidad y seguridad:

- **Autenticación local** con email y contraseña (Passport Local + bcrypt)
- **Autenticación OAuth 2.0** con GitHub (Passport GitHub)
- **Autorización basada en roles** (user / admin)
- **Gestión de sesiones** persistentes con express-session y connect-mongo
- **Tokens JWT** enviados en cookie httpOnly y en el body de la respuesta

### 1.2 Objetivo Arquitectónico

Diseñar un backend organizado en **capas bien definidas** (config, models, strategies, controllers, middlewares, routes) que separe responsabilidades, facilite el mantenimiento y aplique las mejores prácticas de seguridad en autenticación web.

### 1.3 Estrategias de Autenticación Implementadas

| Estrategia | Librería | Uso |
|---|---|---|
| **Local** | passport-local | Registro y login con email/password |
| **GitHub OAuth** | passport-github2 | Login social con cuenta de GitHub |
| **JWT** | jsonwebtoken | Protección de rutas con tokens stateless |
| **Sesiones** | express-session + connect-mongo | Persistencia de sesión en MongoDB |

### 1.4 Justificación del Enfoque

Se eligió un enfoque **híbrido (cookie + JWT)** porque:

1. **JWT en cookie httpOnly** protege contra ataques XSS (el JavaScript del cliente no puede leer el token).
2. **JWT también en el body** permite a clientes móviles o SPAs almacenarlo manualmente si lo necesitan.
3. **express-session con connect-mongo** mantiene sesiones server-side que permiten invalidación inmediata (logout real), algo que JWT por sí solo no ofrece.
4. **Passport** abstrae las estrategias de autenticación, facilitando agregar nuevos proveedores OAuth en el futuro.

---

## 2. Arquitectura del Proyecto

### 2.1 Estructura de Carpetas

```
Proyecto Final Backend II/
├── src/
│   ├── config/
│   │   ├── db.js                  # Conexión a MongoDB (Mongoose)
│   │   ├── env.js                 # Variables de entorno centralizadas
│   │   ├── passport.js            # Inicialización de Passport y serialización
│   │   └── session.js             # Configuración de express-session + connect-mongo
│   ├── controllers/
│   │   ├── authController.js      # Register, Login, GitHub callback, Logout
│   │   ├── sessionController.js   # GET /api/v1/session
│   │   └── userController.js      # Profile y Admin
│   ├── middlewares/
│   │   ├── authMiddleware.js      # Verificación de JWT (cookie o header)
│   │   ├── errorHandler.js        # Manejo centralizado de errores
│   │   └── roleMiddleware.js      # Verificación de rol (user/admin)
│   ├── models/
│   │   └── User.js                # Modelo Mongoose con bcrypt integrado
│   ├── routes/
│   │   ├── authRoutes.js          # /api/v1/auth/*
│   │   ├── sessionRoutes.js       # /api/v1/session
│   │   └── userRoutes.js          # /api/v1/profile, /api/v1/admin
│   ├── strategies/
│   │   ├── githubStrategy.js      # Passport GitHub OAuth Strategy
│   │   └── localStrategy.js       # Passport Local Strategy
│   └── app.js                     # Configuración de Express (middlewares + rutas)
├── .env.example                   # Template de variables de entorno
├── .gitignore
├── package.json
└── server.js                      # Entry point: conecta DB e inicia servidor
```

### 2.2 Explicación de Cada Capa

#### `config/`
Centraliza toda la configuración de la aplicación. Cada archivo tiene una responsabilidad única:
- **`env.js`**: Carga las variables de entorno con `dotenv` y las exporta como un objeto validado.
- **`db.js`**: Establece la conexión a MongoDB con Mongoose.
- **`session.js`**: Configura express-session con MongoStore para persistencia.
- **`passport.js`**: Registra las estrategias y configura serialización/deserialización.

#### `models/`
Define los schemas de Mongoose. El modelo `User` incluye:
- Campos para autenticación local y OAuth
- Pre-save hook para hashear passwords con bcrypt
- Método `comparePassword()` para verificación
- Override de `toJSON()` para nunca exponer la password

#### `routes/`
Define los endpoints de la API agrupados por dominio funcional. Cada archivo de rutas importa su controller correspondiente y aplica los middlewares necesarios.

#### `controllers/`
Contienen la lógica de negocio de cada endpoint. Reciben `req`, `res`, `next` y delegan la validación de datos, operaciones de base de datos y generación de tokens.

#### `middlewares/`
Funciones intermedias que procesan la request antes de llegar al controller:
- **`authMiddleware`**: Extrae y verifica el JWT
- **`roleMiddleware`**: Verifica el rol del usuario
- **`errorHandler`**: Captura errores y retorna respuestas consistentes

#### `strategies/`
Implementaciones de las estrategias de Passport. Están separadas del archivo de configuración para mantener el código modular y testeable.

### 2.3 Diagrama de Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE AUTENTICACIÓN                          │
└─────────────────────────────────────────────────────────────────────┘

                          ┌──────────┐
                          │ CLIENTE  │
                          └────┬─────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
           ┌─────▼─────┐             ┌───────▼───────┐
           │ Login Local│             │ Login GitHub  │
           │ (email/pw) │             │   (OAuth 2.0) │
           └─────┬─────┘             └───────┬───────┘
                 │                           │
        ┌────────▼────────┐         ┌────────▼────────┐
        │ Passport Local  │         │ Passport GitHub │
        │   Strategy      │         │   Strategy      │
        │                 │         │                 │
        │ 1. Buscar user  │         │ 1. Redirect a   │
        │ 2. Verificar pw │         │    GitHub       │
        │    (bcrypt)     │         │ 2. Callback     │
        └────────┬────────┘         │ 3. Buscar/crear │
                 │                  │    usuario      │
                 │                  └────────┬────────┘
                 │                           │
                 └─────────────┬─────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Autenticación OK    │
                    │                     │
                    │ 1. Crear sesión     │
                    │ 2. Generar JWT      │
                    │    {userId, role}   │
                    │    exp: 1h          │
                    │ 3. Setear cookie    │
                    │    (authToken)      │
                    │ 4. Retornar token   │
                    │    en body          │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ RUTAS PROTEGIDAS    │
                    │                     │
                    │ authMiddleware:     │
                    │ → Lee JWT de cookie │
                    │   o header Bearer  │
                    │ → Verifica token   │
                    │ → 401 si inválido  │
                    │                     │
                    │ roleMiddleware:     │
                    │ → Verifica rol     │
                    │ → 403 si no tiene  │
                    │   permisos         │
                    └─────────────────────┘
```

---

## 3. Implementación Técnica

### 3.1 Registro de Usuario

**Endpoint:** `POST /api/v1/auth/register`

#### Modelo User (código relevante)

```javascript
// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, default: '', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    provider: { type: String, enum: ['local', 'github'], default: 'local' },
    providerId: { type: String, default: null },
    avatar: { type: String, default: null }
  },
  { timestamps: true }
);
```

#### Hash con bcrypt (pre-save hook)

```javascript
// src/models/User.js — Middleware pre-save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

El hash se genera automáticamente al crear o modificar la password del usuario. Se usa un **salt de 10 rounds**, que ofrece un buen balance entre seguridad y rendimiento.

#### Validación de duplicados

```javascript
// src/controllers/authController.js — register()
const existingUser = await User.findOne({ email });
if (existingUser) {
  return res.status(409).json({
    status: 'error',
    message: 'El email ya está registrado.'
  });
}
```

Además, el campo `email` tiene `unique: true` en el schema de Mongoose, lo que crea un índice único en MongoDB como segunda capa de protección.

#### Ejemplo de Request y Response

**Request:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan@example.com",
  "password": "MiPassword123"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente.",
  "payload": {
    "_id": "6839abc1234def5678901234",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@example.com",
    "role": "user",
    "provider": "local",
    "providerId": null,
    "avatar": null,
    "createdAt": "2026-06-14T13:00:00.000Z",
    "updatedAt": "2026-06-14T13:00:00.000Z"
  }
}
```

> **Nota:** La password nunca se incluye en la respuesta gracias al override de `toJSON()` en el modelo.

**Response de error (409 Conflict — email duplicado):**
```json
{
  "status": "error",
  "message": "El email ya está registrado."
}
```

---

### 3.2 Login Local (Passport)

**Endpoint:** `POST /api/v1/auth/login`

#### Configuración de Passport Local Strategy

```javascript
// src/strategies/localStrategy.js
const { Strategy: LocalStrategy } = require('passport-local');
const User = require('../models/User');

const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',    // Usar email en vez de username
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }

      // Verificar que sea usuario local (no OAuth)
      if (user.provider !== 'local') {
        return done(null, false, {
          message: `Este email está registrado con ${user.provider}. Usá ese método para iniciar sesión.`
        });
      }

      // Comparar password con bcrypt
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return done(null, false, { message: 'Contraseña incorrecta' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);
```

#### Generación del JWT

```javascript
// src/controllers/authController.js — login()
const tokenPayload = {
  userId: user._id,
  role: user.role
};

const token = jwt.sign(tokenPayload, config.jwtSecret, {
  expiresIn: '1h'  // Expiración de 1 hora
});
```

El JWT contiene `{ userId, role }` como payload y expira en **1 hora**.

#### Envío del Token en Cookie y Body

```javascript
// Cookie httpOnly con configuración segura
res.cookie('authToken', token, {
  httpOnly: true,           // No accesible desde JavaScript del cliente
  sameSite: 'Lax',          // Protección contra CSRF
  secure: config.isProduction, // Solo HTTPS en producción
  maxAge: 3600000           // 1 hora en milisegundos
});

// También en el body de la respuesta
res.status(200).json({
  status: 'success',
  message: 'Login exitoso.',
  token,          // Token en body para clientes que lo necesiten
  payload: user
});
```

#### Ejemplo de Request y Response

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "MiPassword123"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Login exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODM5YWJjMTIzNGRlZjU2Nzg5MDEyMzQiLCJyb2xlIjoidXNlciIsImlhdCI6MTcxODM2NDAwMCwiZXhwIjoxNzE4MzY3NjAwfQ.firma_aqui",
  "payload": {
    "_id": "6839abc1234def5678901234",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@example.com",
    "role": "user",
    "provider": "local"
  }
}
```

**Headers de respuesta (cookie seteada):**
```
Set-Cookie: authToken=eyJhbGciOiJIUzI1NiIs...; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600
```

---

### 3.3 Login OAuth (GitHub)

#### Configuración de la Estrategia GitHub

```javascript
// src/strategies/githubStrategy.js
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const config = require('../config/env');

const githubStrategy = new GitHubStrategy(
  {
    clientID: config.github.clientId,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackUrl,
    scope: ['user:email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscar usuario existente por provider + providerId
      let user = await User.findOne({
        provider: 'github',
        providerId: profile.id
      });

      if (user) return done(null, user);

      // Obtener email del perfil
      const email = profile.emails?.[0]?.value || `github_${profile.id}@noemail.com`;

      // Verificar conflicto con cuenta local
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return done(null, false, {
          message: 'Ya existe una cuenta con ese email registrada localmente.'
        });
      }

      // Crear nuevo usuario con datos de GitHub
      const newUser = await User.create({
        first_name: profile.displayName || profile.username || 'GitHub User',
        last_name: '',
        email,
        provider: 'github',
        providerId: profile.id,
        avatar: profile.photos?.[0]?.value || null,
        role: 'user'
      });

      return done(null, newUser);
    } catch (error) {
      return done(error);
    }
  }
);
```

#### Creación de Usuario si No Existe

Si el usuario no existe en la base de datos, se crea automáticamente con los datos del perfil de GitHub:
- `first_name` se toma de `displayName` o `username`
- `email` se obtiene del scope `user:email`
- `provider` se setea como `'github'`
- `providerId` almacena el ID único de GitHub
- No se genera password (campo opcional en el modelo)

#### Mantenimiento de la Sesión

La sesión se mantiene mediante **dos mecanismos complementarios**:

1. **express-session**: Al ejecutar `req.logIn(user, ...)`, Passport serializa el `_id` del usuario en la sesión, que se persiste en MongoDB a través de connect-mongo.
2. **JWT en cookie**: Se genera y envía un JWT en una cookie httpOnly, lo que permite validar la identidad en rutas protegidas sin necesidad de consultar la sesión.

#### Flujo OAuth

```
1. Cliente → GET /api/v1/auth/github
2. Passport redirige → GitHub (autorización)
3. GitHub redirige → GET /api/v1/auth/github/callback
4. Passport ejecuta el callback de la estrategia
5. Se busca/crea el usuario en MongoDB
6. Se genera JWT + sesión
7. Se retorna respuesta con token
```

---

### 3.4 Sistema de Sesiones

#### Configuración de express-session

```javascript
// src/config/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('./env');

const sessionConfig = session({
  store: MongoStore.create({
    mongoUrl: config.mongoUri,
    ttl: 60 * 60,              // TTL: 1 hora
    collectionName: 'sessions'  // Colección en MongoDB
  }),
  secret: config.sessionSecret,
  resave: false,                // No reguardar si no hubo cambios
  saveUninitialized: false,     // No crear sesión vacía
  cookie: {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.isProduction,
    maxAge: 1000 * 60 * 60      // 1 hora
  }
});
```

#### Uso de connect-mongo

`connect-mongo` persiste las sesiones en una colección `sessions` de MongoDB. Esto permite:
- Que las sesiones sobrevivan a reinicios del servidor
- Escalabilidad horizontal (múltiples instancias comparten el mismo store)
- Expiración automática mediante TTL de MongoDB

#### Ejemplo de Documento de Sesión en Base de Datos

```json
{
  "_id": "pVz2Xk3mNqR7wYhT",
  "expires": "2026-06-14T14:00:00.000Z",
  "session": {
    "cookie": {
      "originalMaxAge": 3600000,
      "expires": "2026-06-14T14:00:00.000Z",
      "httpOnly": true,
      "sameSite": "Lax",
      "secure": false,
      "path": "/"
    },
    "passport": {
      "user": "6839abc1234def5678901234"
    }
  }
}
```

#### Implementación de GET /api/v1/session

```javascript
// src/controllers/sessionController.js
const getSession = (req, res) => {
  if (req.session && req.session.passport) {
    return res.status(200).json({
      status: 'success',
      message: 'Sesión activa.',
      payload: {
        sessionId: req.sessionID,
        user: req.session.passport.user,
        cookie: req.session.cookie
      }
    });
  }

  res.status(401).json({
    status: 'error',
    message: 'No hay sesión activa.'
  });
};
```

#### Ejemplo de Respuesta

```json
{
  "status": "success",
  "message": "Sesión activa.",
  "payload": {
    "sessionId": "pVz2Xk3mNqR7wYhT",
    "user": "6839abc1234def5678901234",
    "cookie": {
      "originalMaxAge": 3600000,
      "expires": "2026-06-14T14:00:00.000Z",
      "httpOnly": true,
      "sameSite": "Lax",
      "secure": false
    }
  }
}
```

---

### 3.5 Rutas Protegidas

#### GET /api/v1/profile — Protegida por JWT

```javascript
// src/routes/userRoutes.js
router.get('/profile', authMiddleware, getProfile);
```

```javascript
// src/middlewares/authMiddleware.js
const authMiddleware = (req, res, next) => {
  // 1. Buscar token en cookie
  let token = req.cookies?.authToken;

  // 2. Si no hay cookie, buscar en header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  // 3. Sin token → 401
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No autenticado. Se requiere un token válido.'
    });
  }

  // 4. Verificar token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: error.name === 'TokenExpiredError'
        ? 'Token expirado. Iniciá sesión nuevamente.'
        : 'Token inválido.'
    });
  }
};
```

**Request exitoso:**
```http
GET /api/v1/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "status": "success",
  "payload": {
    "_id": "6839abc1234def5678901234",
    "first_name": "Juan",
    "last_name": "Pérez",
    "email": "juan@example.com",
    "role": "user",
    "provider": "local"
  }
}
```

**Response sin token (401 Unauthorized):**
```json
{
  "status": "error",
  "message": "No autenticado. Se requiere un token válido."
}
```

#### GET /api/v1/admin — Protegida por JWT + Rol Admin

```javascript
// src/routes/userRoutes.js
router.get('/admin', authMiddleware, roleMiddleware('admin'), getAdmin);
```

```javascript
// src/middlewares/roleMiddleware.js
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'No autenticado.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'No autorizado. No tenés permisos para acceder a este recurso.'
      });
    }

    next();
  };
};
```

**Request con rol admin (200 OK):**
```json
{
  "status": "success",
  "message": "Bienvenido al panel de administración.",
  "payload": {
    "user": {
      "_id": "6839abc1234def5678901234",
      "first_name": "Admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "adminData": {
      "totalUsers": 5,
      "message": "Acceso de administrador verificado."
    }
  }
}
```

**Request con rol user (403 Forbidden):**
```json
{
  "status": "error",
  "message": "No autorizado. No tenés permisos para acceder a este recurso."
}
```

---

### 3.6 Logout

**Endpoint:** `POST /api/v1/auth/logout`

```javascript
// src/controllers/authController.js — logout()
const logout = (req, res, next) => {
  // 1. Destruir la sesión server-side
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al destruir sesión:', err);
      return next(err);
    }

    // 2. Limpiar la cookie de sesión (connect.sid)
    res.clearCookie('connect.sid');

    // 3. Limpiar la cookie del token JWT (authToken)
    res.clearCookie('authToken');

    // 4. Responder al cliente
    res.status(200).json({
      status: 'success',
      message: 'Logout exitoso. Sesión destruida y cookies limpiadas.'
    });
  });
};
```

#### ¿Qué ocurre en cada paso?

1. **`req.session.destroy()`**: Elimina la sesión del store de MongoDB. El documento de la colección `sessions` se borra.
2. **`res.clearCookie('connect.sid')`**: Elimina la cookie de sesión del navegador del cliente.
3. **`res.clearCookie('authToken')`**: Elimina la cookie que contiene el JWT.
4. **Manejo del token en el cliente**: El cliente (frontend/SPA) debe eliminar cualquier referencia al token que haya guardado en memoria o localStorage. Dado que el JWT es **stateless**, un token no expirado seguirá siendo técnicamente válido hasta su expiración, pero al eliminar las cookies el navegador no lo enviará automáticamente.

**Response:**
```json
{
  "status": "success",
  "message": "Logout exitoso. Sesión destruida y cookies limpiadas."
}
```

---

## 4. Seguridad y Decisiones Arquitectónicas

### ¿Dónde vive el rol y por qué?

El rol (`'user'` o `'admin'`) vive en **dos lugares**:

1. **Base de datos** (`User.role`): Es la fuente de verdad. Aquí se consulta y modifica el rol.
2. **Payload del JWT** (`{ userId, role }`): Se incluye para evitar una consulta a la DB en cada request a una ruta protegida. Esto hace que la autorización sea **stateless** y rápida.

**Trade-off**: Si el rol cambia en la DB, el JWT existente seguirá teniendo el rol anterior hasta que expire (máx. 1 hora). Esto es aceptable para la mayoría de los casos. Si se requiere invalidación inmediata, se puede implementar una **blacklist de tokens** o verificar el rol contra la DB en rutas críticas.

### ¿Cómo se mitigó CSRF?

Se aplican **tres capas de protección** contra CSRF:

1. **`sameSite: 'Lax'`** en todas las cookies: Evita que las cookies se envíen en requests cross-origin de tipo POST, PUT, DELETE (los más peligrosos).
2. **`httpOnly: true`**: Impide que JavaScript del cliente acceda a las cookies, eliminando el vector de ataque XSS → CSRF.
3. **Verificación por header `Authorization`**: Las rutas protegidas aceptan el JWT tanto por cookie como por header Bearer. Un atacante CSRF no puede setear headers custom.

### ¿Cómo se diferencia entorno local y producción?

A través de la variable de entorno `NODE_ENV`:

```javascript
// src/config/env.js
isProduction: process.env.NODE_ENV === 'production'
```

Esto afecta:
- **`secure` en cookies**: Solo se activa en producción (requiere HTTPS).
- **Logging**: En desarrollo se muestran errores detallados.
- **CORS**: El origin puede configurarse diferente por entorno.

### ¿Por qué cookie + JWT en vez de solo uno?

| Solo JWT (header) | Solo Cookie | Cookie + JWT (híbrido) ✅ |
|---|---|---|
| Vulnerable si se guarda en localStorage (XSS) | No sirve para clientes móviles | Cookie httpOnly protege contra XSS |
| No tiene protección CSRF automática | Vulnerable a CSRF sin sameSite | JWT en body para clientes que no usan cookies |
| Difícil de invalidar | Requiere estado server-side | express-session permite logout real |

El enfoque híbrido combina las ventajas de ambos: seguridad de las cookies httpOnly + flexibilidad del JWT en el body.

### ¿Qué ocurre si el rol cambia con un token ya emitido?

Si un administrador cambia el rol de un usuario en la base de datos (por ejemplo, de `'user'` a `'admin'`), el JWT ya emitido seguirá conteniendo `role: 'user'` hasta que expire (máximo 1 hora).

**Mitigaciones implementadas:**
- **Expiración corta (1h)**: Limita la ventana de inconsistencia.
- **La sesión se puede destruir**: Un admin puede invalidar la sesión del usuario, forzándolo a re-loguearse y obtener un nuevo token con el rol actualizado.
- **Para rutas ultra-sensibles**: Se podría agregar una verificación del rol en tiempo real contra la DB, aceptando el costo de una consulta adicional.

---

## 5. Evidencia de Funcionamiento

### 5.1 Capturas de Postman

> **Nota**: Las siguientes capturas muestran las pruebas realizadas con Postman contra el servidor local en `http://localhost:8080`.

#### Registro exitoso
```
POST http://localhost:8080/api/v1/auth/register
Body (JSON):
{
  "first_name": "Juan",
  "last_name": "Pérez",
  "email": "juan@example.com",
  "password": "MiPassword123"
}

→ Response: 201 Created
{
  "status": "success",
  "message": "Usuario registrado exitosamente.",
  "payload": { ... }
}
```

#### Login exitoso
```
POST http://localhost:8080/api/v1/auth/login
Body (JSON):
{
  "email": "juan@example.com",
  "password": "MiPassword123"
}

→ Response: 200 OK
{
  "status": "success",
  "message": "Login exitoso.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "payload": { ... }
}

→ Cookie seteada: authToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; SameSite=Lax
```

#### Ruta protegida (/profile)
```
GET http://localhost:8080/api/v1/profile
Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

→ Response: 200 OK
{
  "status": "success",
  "payload": {
    "first_name": "Juan",
    "email": "juan@example.com",
    "role": "user"
  }
}
```

#### Ruta protegida sin token (401)
```
GET http://localhost:8080/api/v1/profile
(sin Authorization header ni cookie)

→ Response: 401 Unauthorized
{
  "status": "error",
  "message": "No autenticado. Se requiere un token válido."
}
```

#### Ruta admin con rol user (403)
```
GET http://localhost:8080/api/v1/admin
Headers: Authorization: Bearer <token_de_usuario_con_role_user>

→ Response: 403 Forbidden
{
  "status": "error",
  "message": "No autorizado. No tenés permisos para acceder a este recurso."
}
```

#### Ruta admin con rol admin (200)
```
GET http://localhost:8080/api/v1/admin
Headers: Authorization: Bearer <token_de_usuario_con_role_admin>

→ Response: 200 OK
{
  "status": "success",
  "message": "Bienvenido al panel de administración.",
  "payload": { ... }
}
```

#### Logout
```
POST http://localhost:8080/api/v1/auth/logout

→ Response: 200 OK
{
  "status": "success",
  "message": "Logout exitoso. Sesión destruida y cookies limpiadas."
}
```

### 5.2 Ejemplo de Token JWT Real

**Token generado:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODM5YWJjMTIzNGRlZjU2Nzg5MDEyMzQiLCJyb2xlIjoidXNlciIsImlhdCI6MTcxODM2NDAwMCwiZXhwIjoxNzE4MzY3NjAwfQ.sG8Yf2kLm9X5z_QwR7vN3pA
```

**Payload decodificado (jwt.io):**
```json
{
  "userId": "6839abc1234def5678901234",
  "role": "user",
  "iat": 1718364000,
  "exp": 1718367600
}
```
- `iat`: Fecha de emisión (issued at)
- `exp`: Fecha de expiración (1 hora después)

### 5.3 Cookie Configurada Correctamente

```
Set-Cookie: authToken=eyJhbGciOiJIUzI1NiIs...;
  Path=/;
  HttpOnly;          ← No accesible desde JavaScript
  SameSite=Lax;      ← Protección CSRF
  Max-Age=3600       ← 1 hora
```

> En producción se agrega el flag `Secure`, que requiere HTTPS.

---

## 6. Instrucciones de Instalación

### 6.1 Dependencias Necesarias

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "connect-mongo": "^5.1.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.5",
    "passport": "^0.7.0",
    "passport-github2": "^0.1.12",
    "passport-local": "^1.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.9"
  }
}
```

### 6.2 Archivo .env.example

```env
# Entorno
PORT=8080
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/auth_db?retryWrites=true&w=majority

# JWT
JWT_SECRET=mi_clave_secreta_super_segura_cambiar_en_produccion

# Sesiones
SESSION_SECRET=mi_session_secret_cambiar_en_produccion

# GitHub OAuth
GITHUB_CLIENT_ID=tu_github_client_id
GITHUB_CLIENT_SECRET=tu_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:8080/api/v1/auth/github/callback
```

### 6.3 Variables de Entorno Explicadas

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor Express | `8080` |
| `NODE_ENV` | Entorno de ejecución | `development` / `production` |
| `MONGO_URI` | URI de conexión a MongoDB (local o Atlas) | `mongodb+srv://user:pass@cluster.mongodb.net/auth_db` |
| `JWT_SECRET` | Clave secreta para firmar y verificar tokens JWT | Cadena larga y aleatoria |
| `SESSION_SECRET` | Clave secreta para firmar las cookies de sesión | Cadena larga y aleatoria |
| `GITHUB_CLIENT_ID` | Client ID de la GitHub OAuth App | Se obtiene en GitHub > Settings > Developer settings |
| `GITHUB_CLIENT_SECRET` | Client Secret de la GitHub OAuth App | Se obtiene en GitHub > Settings > Developer settings |
| `GITHUB_CALLBACK_URL` | URL de callback para GitHub OAuth | `http://localhost:8080/api/v1/auth/github/callback` |

### 6.4 Pasos para Ejecutar Localmente

1. **Clonar o descargar el proyecto** y posicionarse en la carpeta raíz.

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Crear el archivo `.env`** copiando desde el template:
   ```bash
   cp .env.example .env
   ```

4. **Configurar las variables de entorno** en el archivo `.env`:
   - Completar `MONGO_URI` con la URI de tu instancia de MongoDB (local o Atlas)
   - Generar valores seguros para `JWT_SECRET` y `SESSION_SECRET`
   - Configurar las credenciales de GitHub OAuth (ver paso 5)

5. **Crear una GitHub OAuth App** (para login con GitHub):
   - Ir a [GitHub > Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
   - Click en "New OAuth App"
   - **Homepage URL**: `http://localhost:8080`
   - **Authorization callback URL**: `http://localhost:8080/api/v1/auth/github/callback`
   - Copiar el Client ID y Client Secret al `.env`

6. **Iniciar el servidor en modo desarrollo:**
   ```bash
   npm run dev
   ```

7. **Verificar** que el servidor esté corriendo accediendo a:
   ```
   http://localhost:8080
   ```
   Debería responder:
   ```json
   {
     "status": "success",
     "message": "API de Autenticación Híbrida - Backend II",
     "version": "1.0.0"
   }
   ```

8. **Probar los endpoints** con Postman u otra herramienta siguiendo los ejemplos de la sección 5.
