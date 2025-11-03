# Plan de Implementación: Autenticación OIDC en Ghostfolio

**Fecha de inicio**: 3 de noviembre de 2025  
**Estado**: 🟡 En planificación

---

## 📋 Análisis de Autenticación Actual

### 🔐 Métodos de Autenticación Existentes

#### 1. **Autenticación Anónima (Access Token)**

- ✅ **Ubicación**: `apps/api/src/app/auth/auth.controller.ts` y `auth.service.ts`
- **Funcionamiento**:
  - Los usuarios crean una cuenta y reciben un `accessToken`
  - El token se hashea con salt y se valida contra la base de datos
  - Genera un JWT tras validación exitosa
- **Endpoints**:
  - `POST /api/auth/anonymous` (actual)
  - `GET /api/auth/anonymous/:accessToken` (deprecated)

#### 2. **OAuth 2.0 con Google**

- ✅ **Ubicación**: `apps/api/src/app/auth/google.strategy.ts`
- **Implementación**:
  - Usa `passport-google-oauth20`
  - Flujo estándar OAuth 2.0
  - Callback URL: `/api/auth/google/callback`
  - Scope: `['profile']` (solo perfil básico)
- **Variables de entorno**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_SECRET`
  - `ROOT_URL`

#### 3. **WebAuthn (Autenticación sin contraseña)**

- ✅ **Ubicación**: `apps/api/src/app/auth/web-auth.service.ts`
- **Implementación**:
  - Usa `@simplewebauthn/server` y `@simplewebauthn/browser`
  - Soporte para dispositivos biométricos (Face ID, Touch ID, etc.)
  - Registro y autenticación de dispositivos
- **Endpoints**:
  - `GET /api/auth/webauthn/generate-registration-options`
  - `POST /api/auth/webauthn/verify-attestation`
  - `POST /api/auth/webauthn/generate-authentication-options`
  - `POST /api/auth/webauthn/verify-authentication`

#### 4. **API Key Authentication**

- ✅ **Ubicación**: `apps/api/src/app/auth/api-key.strategy.ts`
- **Funcionamiento**:
  - Usa `passport-headerapikey`
  - Header: `x-api-key` con prefijo `Api-Key`
  - Para integración con APIs externas

#### 5. **JWT Bearer Token**

- ✅ **Ubicación**: `apps/api/src/app/auth/jwt.strategy.ts`
- **Implementación**:
  - Estrategia principal de autorización
  - Expira en 180 días
  - Extracción desde Authorization header
  - Validación de usuarios inactivos y analytics

### 📊 Modelo de Datos Actual (Prisma)

```prisma
enum Provider {
  ANONYMOUS
  GOOGLE
  INTERNET_IDENTITY  // No implementado actualmente
}

model User {
  // ... otros campos
  provider      Provider        @default(ANONYMOUS)
  thirdPartyId  String?
  // ...
}
```

---

## 🎯 Plan de Implementación OIDC

### **Fase 1: Análisis y Diseño** ✅

- [x] Analizar métodos de autenticación existentes
- [x] Diseñar arquitectura de integración OIDC
- [x] Definir enfoque de coexistencia con métodos actuales
- [x] Decidir estrategia de provider genérico vs específico

**Decisiones de diseño**:

1. Estrategia genérica OIDC configurable para múltiples proveedores
2. OIDC coexistirá con los métodos existentes
3. Añadir nuevo valor `OIDC` al enum Provider
4. Usar campo `thirdPartyId` existente para almacenar `sub` del token OIDC

---

### **Fase 2: Cambios en la Base de Datos** ⏳

- [ ] Modificar `prisma/schema.prisma` para añadir Provider.OIDC
- [ ] (Opcional) Añadir campo `oidcIssuer` para distinguir proveedores
- [ ] Crear migración de base de datos
- [ ] Ejecutar migración en desarrollo
- [ ] Validar cambios en base de datos

#### Cambios necesarios en `prisma/schema.prisma`

```prisma
enum Provider {
  ANONYMOUS
  GOOGLE
  INTERNET_IDENTITY
  OIDC  // 🆕 Añadir
}

// Opcional: Si se necesita distinguir múltiples proveedores OIDC
model User {
  // ... campos existentes
  oidcIssuer String?  // 🆕 Para identificar el proveedor OIDC específico
}
```

#### Comandos a ejecutar

```bash
# Crear migración
npx prisma migrate dev --name add_oidc_provider

# O push directo para desarrollo
npm run database:push
```

**Archivos afectados**:

- `prisma/schema.prisma`
- `prisma/migrations/YYYYMMDD_add_oidc_provider/migration.sql` (nuevo)

---

### **Fase 3: Dependencias** ⏳

- [ ] Instalar `passport-openidconnect`
- [ ] Instalar `@types/passport-openidconnect`
- [ ] Verificar compatibilidad de versiones
- [ ] Actualizar `package.json` y `package-lock.json`

#### Comandos a ejecutar

```bash
npm install passport-openidconnect
npm install --save-dev @types/passport-openidconnect
```

**Archivos afectados**:

- `package.json`
- `package-lock.json`

---

### **Fase 4: Variables de Entorno** ⏳

- [ ] Actualizar `.env.example` con variables OIDC
- [ ] Documentar cada variable de entorno
- [ ] Crear configuración de ejemplo para proveedores comunes
- [ ] Añadir variables al ConfigurationService si es necesario

#### Añadir a `.env.example`

```bash
# ====================================
# OIDC Authentication Configuration
# ====================================
# Enable/disable OIDC authentication
OIDC_ENABLED=false

# OIDC Provider base URL (must be HTTPS in production)
OIDC_ISSUER=https://your-oidc-provider.com

# OAuth 2.0 Client credentials
OIDC_CLIENT_ID=<YOUR_CLIENT_ID>
OIDC_CLIENT_SECRET=<YOUR_CLIENT_SECRET>

# Callback URL (where OIDC provider redirects after authentication)
OIDC_CALLBACK_URL=${ROOT_URL}/api/auth/oidc/callback

# OpenID Connect scopes (space-separated)
OIDC_SCOPE=openid profile email

# Optional: Override default endpoints (auto-discovered from issuer if not set)
# OIDC_AUTHORIZATION_URL=https://your-oidc-provider.com/authorize
# OIDC_TOKEN_URL=https://your-oidc-provider.com/token
# OIDC_USER_INFO_URL=https://your-oidc-provider.com/userinfo
```

#### Ejemplos de configuración por proveedor

<details>
<summary><strong>Keycloak</strong></summary>

```bash
OIDC_ENABLED=true
OIDC_ISSUER=https://keycloak.example.com/realms/your-realm
OIDC_CLIENT_ID=ghostfolio
OIDC_CLIENT_SECRET=your-secret-here
OIDC_SCOPE=openid profile email
```

</details>

<details>
<summary><strong>Auth0</strong></summary>

```bash
OIDC_ENABLED=true
OIDC_ISSUER=https://your-tenant.auth0.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-secret-here
OIDC_SCOPE=openid profile email
```

</details>

<details>
<summary><strong>Azure AD</strong></summary>

```bash
OIDC_ENABLED=true
OIDC_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
OIDC_CLIENT_ID=your-application-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_SCOPE=openid profile email
```

</details>

<details>
<summary><strong>Okta</strong></summary>

```bash
OIDC_ENABLED=true
OIDC_ISSUER=https://your-domain.okta.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_SCOPE=openid profile email
```

</details>

**Archivos afectados**:

- `.env.example`
- (Posiblemente) `apps/api/src/services/configuration/configuration.service.ts`

---

### **Fase 5: Implementación Backend** ⏳

#### 5.1. Crear estrategia OIDC ⏳

- [ ] Crear archivo `apps/api/src/app/auth/oidc.strategy.ts`
- [ ] Implementar clase OidcStrategy extendiendo PassportStrategy
- [ ] Configurar discovery automático de endpoints
- [ ] Implementar método validate
- [ ] Manejar errores y logging
- [ ] Añadir validación de configuración

**Archivo a crear**: `apps/api/src/app/auth/oidc.strategy.ts`

```typescript
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Strategy, VerifyCallback } from 'passport-openidconnect';
import { AuthService } from './auth.service';

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, 'oidc') {
  private static readonly logger = new Logger(OidcStrategy.name);

  public constructor(
    private readonly authService: AuthService,
    configurationService: ConfigurationService
  ) {
    const issuer = configurationService.get('OIDC_ISSUER');
    const clientID = configurationService.get('OIDC_CLIENT_ID');
    const clientSecret = configurationService.get('OIDC_CLIENT_SECRET');
    const enabled = configurationService.get('OIDC_ENABLED') === 'true';

    if (!enabled || !issuer || !clientID || !clientSecret) {
      OidcStrategy.logger.warn(
        'OIDC authentication is not configured or disabled. ' +
        'Set OIDC_ENABLED=true and provide OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET.'
      );
      // Passport requiere configuración válida, usar placeholders
      super({
        issuer: 'https://placeholder.example.com',
        clientID: 'placeholder',
        clientSecret: 'placeholder',
        authorizationURL: 'https://placeholder.example.com/authorize',
        tokenURL: 'https://placeholder.example.com/token',
        userInfoURL: 'https://placeholder.example.com/userinfo',
        callbackURL: 'https://placeholder.example.com/callback',
        scope: 'openid profile'
      });
      return;
    }

    const callbackURL = configurationService.get('OIDC_CALLBACK_URL') ||
      `${configurationService.get('ROOT_URL')}/api/auth/oidc/callback`;

    const scope = configurationService.get('OIDC_SCOPE') || 'openid profile email';

    // Los endpoints se descubren automáticamente desde el issuer si no se proporcionan
    const config: any = {
      issuer,
      clientID,
      clientSecret,
      callbackURL,
      scope: scope.split(' '),
      passReqToCallback: true
    };

    // Endpoints opcionales (si no se proporcionan, se descubren automáticamente)
    const authorizationURL = configurationService.get('OIDC_AUTHORIZATION_URL');
    const tokenURL = configurationService.get('OIDC_TOKEN_URL');
    const userInfoURL = configurationService.get('OIDC_USER_INFO_URL');

    if (authorizationURL) config.authorizationURL = authorizationURL;
    if (tokenURL) config.tokenURL = tokenURL;
    if (userInfoURL) config.userInfoURL = userInfoURL;

    super(config);

    OidcStrategy.logger.log(
      `OIDC authentication configured with issuer: ${issuer}`
    );
  }

  public async validate(
    _request: any,
    _issuer: string,
    profile: any,
    _context: any,
    _idToken: any,
    _accessToken: any,
    _refreshToken: any,
    params: any,
    done: VerifyCallback
  ) {
    try {
      // El 'sub' (subject) del token es el identificador único del usuario
      const thirdPartyId = params.sub || profile.id;

      if (!thirdPartyId) {
        throw new Error('No subject (sub) found in OIDC token');
      }

      OidcStrategy.logger.debug(
        `Validating OIDC user with sub: ${thirdPartyId}`
      );

      const jwt = await this.authService.validateOAuthLogin({
        provider: Provider.OIDC,
        thirdPartyId
      });

      done(null, { jwt, profile });
    } catch (error) {
      OidcStrategy.logger.error(
        `OIDC validation error: ${error.message}`,
        error.stack
      );
      done(error, false);
    }
  }
}
```

#### 5.2. Actualizar módulo de autenticación ⏳

- [ ] Importar OidcStrategy en `auth.module.ts`
- [ ] Añadir OidcStrategy a providers
- [ ] Verificar importaciones

**Archivo a modificar**: `apps/api/src/app/auth/auth.module.ts`

Añadir:

```typescript
import { OidcStrategy } from './oidc.strategy';

@Module({
  // ...
  providers: [
    ApiKeyService,
    ApiKeyStrategy,
    AuthDeviceService,
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    OidcStrategy,  // 🆕 Añadir aquí
    WebAuthService
  ]
})
export class AuthModule {}
```

#### 5.3. Añadir endpoints al controlador ⏳

- [ ] Añadir endpoint `/auth/oidc` para iniciar login
- [ ] Añadir endpoint `/auth/oidc/callback` para callback
- [ ] Implementar manejo de errores
- [ ] Añadir guard condicional si OIDC está deshabilitado

**Archivo a modificar**: `apps/api/src/app/auth/auth.controller.ts`

Añadir antes del último endpoint:

```typescript
@Get('oidc')
@UseGuards(AuthGuard('oidc'))
public oidcLogin() {
  // Inicia el flujo de autenticación OIDC
  // Passport redirige automáticamente al proveedor OIDC
}

@Get('oidc/callback')
@UseGuards(AuthGuard('oidc'))
@Version(VERSION_NEUTRAL)
public oidcLoginCallback(
  @Req() request: Request,
  @Res() response: Response
) {
  // Maneja el callback del proveedor OIDC
  const jwt: string = (request.user as any).jwt;

  if (jwt) {
    response.redirect(
      `${this.configurationService.get('ROOT_URL')}/${DEFAULT_LANGUAGE_CODE}/auth/${jwt}`
    );
  } else {
    // Error en autenticación
    response.redirect(
      `${this.configurationService.get('ROOT_URL')}/${DEFAULT_LANGUAGE_CODE}/auth?error=oidc_failed`
    );
  }
}
```

#### 5.4. Verificar AuthService ⏳

- [ ] Confirmar que `validateOAuthLogin` funciona con Provider.OIDC
- [ ] Añadir lógica específica si es necesario (ej: almacenar issuer)
- [ ] Verificar creación de usuarios nuevos
- [ ] Verificar que property `isUserSignupEnabled` se respeta

**Archivo a revisar**: `apps/api/src/app/auth/auth.service.ts`

El método existente ya debería funcionar:

```typescript
public async validateOAuthLogin({
  provider,
  thirdPartyId
}: ValidateOAuthLoginParams): Promise<string> {
  // Este método ya soporta cualquier provider del enum
  // No requiere cambios si Provider.OIDC está en el enum
}
```

#### 5.5. Testing backend ⏳

- [ ] Crear tests unitarios para OidcStrategy
- [ ] Crear tests de integración para endpoints
- [ ] Verificar manejo de errores
- [ ] Test con configuración inválida/faltante

**Archivos a crear**:

- `apps/api/src/app/auth/oidc.strategy.spec.ts`

---

### **Fase 6: Implementación Frontend** ⏳

#### 6.1. Añadir botón de login OIDC ⏳

- [ ] Identificar componente de login actual
- [ ] Añadir botón "Sign in with OIDC" o customizable
- [ ] Implementar redirección a `/api/auth/oidc`
- [ ] Añadir iconografía apropiada
- [ ] Hacer el botón condicional (mostrar solo si OIDC está habilitado)

**Archivos a investigar**:

- `apps/client/src/app/pages/landing/`
- `apps/client/src/app/pages/webauthn/`
- Componentes relacionados con login/auth

#### 6.2. Verificar flujo de redirección ⏳

- [ ] Confirmar que `/auth/:jwt` maneja correctamente el token OIDC
- [ ] Añadir manejo de errores (parámetro `?error=oidc_failed`)
- [ ] Verificar storage del token
- [ ] Probar navegación post-login

**Archivo a revisar**: `apps/client/src/app/pages/auth/auth-page.component.ts`

#### 6.3. Configuración visual (opcional) ⏳

- [ ] Permitir customización del texto del botón via config
- [ ] Permitir customización del logo del proveedor
- [ ] Responsive design para botón OIDC

#### 6.4. Testing frontend ⏳

- [ ] Test unitario del componente con botón OIDC
- [ ] Test e2e del flujo completo
- [ ] Verificar en diferentes navegadores

---

### **Fase 7: Configuración y Seguridad** ⏳

#### 7.1. Validaciones de seguridad ⏳

- [ ] Validar que OIDC_ISSUER sea HTTPS en producción
- [ ] Implementar validación de state/nonce
- [ ] Verificar validación de firma de tokens JWT
- [ ] Implementar timeout de sesión configurable
- [ ] Añadir rate limiting a endpoints OIDC

#### 7.2. ConfigurationService ⏳

- [ ] Verificar que todas las variables OIDC están disponibles
- [ ] Añadir validación de variables requeridas al inicio
- [ ] Implementar feature flag para OIDC_ENABLED

**Archivo a modificar (posiblemente)**:

- `apps/api/src/services/configuration/configuration.service.ts`

#### 7.3. Logging y monitoreo ⏳

- [ ] Añadir logs de eventos OIDC importantes
- [ ] Implementar métricas de autenticación OIDC
- [ ] Añadir alertas para fallos de autenticación

#### 7.4. Multi-issuer (Opcional avanzado) ⏳

Si se necesita soportar múltiples proveedores OIDC simultáneamente:

- [ ] Añadir campo `oidcIssuer` al modelo User
- [ ] Modificar `validateOAuthLogin` para incluir issuer
- [ ] Crear estrategias dinámicas por issuer
- [ ] Añadir UI para seleccionar proveedor

---

### **Fase 8: Testing Integral** ⏳

#### 8.1. Testing local ⏳

- [ ] Configurar Keycloak local en Docker
- [ ] Probar flujo completo de registro nuevo usuario
- [ ] Probar flujo completo de login usuario existente
- [ ] Probar manejo de errores (credenciales inválidas)
- [ ] Probar con OIDC deshabilitado

#### 8.2. Testing con proveedores reales ⏳

- [ ] Keycloak
- [ ] Auth0
- [ ] Azure AD
- [ ] Okta
- [ ] Otro proveedor OIDC genérico

#### 8.3. Testing de regresión ⏳

- [ ] Verificar que Google OAuth sigue funcionando
- [ ] Verificar que autenticación anónima sigue funcionando
- [ ] Verificar que WebAuthn sigue funcionando
- [ ] Verificar que API Keys siguen funcionando

#### 8.4. Testing de seguridad ⏳

- [ ] Intentar bypass de autenticación
- [ ] Verificar protección CSRF
- [ ] Verificar manejo de tokens expirados
- [ ] Penetration testing básico

---

### **Fase 9: Documentación** ⏳

#### 9.1. Documentación técnica ⏳

- [ ] Actualizar `DEVELOPMENT.md` con setup OIDC
- [ ] Documentar arquitectura de autenticación
- [ ] Crear diagrama de flujo OIDC
- [ ] Documentar variables de entorno

**Archivo a modificar**: `DEVELOPMENT.md`

Sección a añadir:

````markdown
### OIDC Authentication Setup

Ghostfolio supports OpenID Connect (OIDC) authentication with any compliant provider.

#### Configuration

1. Set up your OIDC provider (Keycloak, Auth0, Azure AD, Okta, etc.)
2. Register Ghostfolio as a client application
3. Configure the following environment variables in your `.env` file:

```bash
OIDC_ENABLED=true
OIDC_ISSUER=https://your-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_CALLBACK_URL=https://your-ghostfolio-instance.com/api/auth/oidc/callback
OIDC_SCOPE=openid profile email
```
````

4. Restart the Ghostfolio server
5. Users can now authenticate using the "Sign in with OIDC" button

#### Provider-Specific Setup Guides

See [docs/oidc-providers.md](docs/oidc-providers.md) for detailed setup instructions for:

- Keycloak
- Auth0
- Azure Active Directory
- Okta
- Generic OIDC providers

```

#### 9.2. Guías de configuración por proveedor ⏳

- [ ] Crear `docs/oidc-providers.md` con guías detalladas
- [ ] Incluir screenshots del proceso de configuración
- [ ] Documentar troubleshooting común por proveedor

**Archivo a crear**: `docs/oidc-providers.md`

#### 9.3. Documentación de usuario ⏳

- [ ] Actualizar FAQ sobre métodos de autenticación
- [ ] Crear guía de usuario para login con OIDC
- [ ] Documentar cómo migrar de un método a otro

#### 9.4. Changelog ⏳

- [ ] Actualizar `CHANGELOG.md` con nueva feature OIDC
- [ ] Documentar breaking changes si los hay
- [ ] Listar proveedores OIDC probados

**Archivo a modificar**: `CHANGELOG.md`

---

### **Fase 10: Deployment y Rollout** ⏳

#### 10.1. Preparación para producción ⏳

- [ ] Crear checklist de deployment
- [ ] Documentar proceso de rollback
- [ ] Preparar scripts de migración de BD
- [ ] Configurar variables de entorno en producción

#### 10.2. Deployment gradual ⏳

- [ ] Desplegar en entorno de staging
- [ ] Testing en staging con usuarios beta
- [ ] Desplegar en producción con feature flag deshabilitado
- [ ] Habilitar OIDC gradualmente

#### 10.3. Monitoreo post-deployment ⏳

- [ ] Monitorear logs de errores OIDC
- [ ] Monitorear tasa de éxito de autenticación
- [ ] Recopilar feedback de usuarios
- [ ] Ajustar configuración según necesidad

---

## 📊 Progreso General

```

[██████░░░░░░░░░░░░░░] 30% - Fase 1 completada

Fase 1: Análisis y Diseño ✅ 100%
Fase 2: Base de Datos ⏳ 0%
Fase 3: Dependencias ⏳ 0%
Fase 4: Variables de Entorno ⏳ 0%
Fase 5: Backend ⏳ 0%
Fase 6: Frontend ⏳ 0%
Fase 7: Seguridad ⏳ 0%
Fase 8: Testing ⏳ 0%
Fase 9: Documentación ⏳ 0%
Fase 10: Deployment ⏳ 0%

```

---

## 📝 Archivos a Crear

### Nuevos archivos backend:
- [ ] `apps/api/src/app/auth/oidc.strategy.ts`
- [ ] `apps/api/src/app/auth/oidc.strategy.spec.ts`

### Nuevos archivos de documentación:
- [ ] `docs/oidc-providers.md`
- [x] `OIDC_IMPLEMENTATION_PLAN.md` (este archivo)

---

## 📝 Archivos a Modificar

### Backend:
- [ ] `prisma/schema.prisma` (añadir Provider.OIDC y opcionalmente oidcIssuer)
- [ ] `apps/api/src/app/auth/auth.module.ts` (registrar OidcStrategy)
- [ ] `apps/api/src/app/auth/auth.controller.ts` (añadir endpoints OIDC)
- [ ] `apps/api/src/app/auth/auth.service.ts` (verificar, posibles ajustes)
- [ ] `apps/api/src/services/configuration/configuration.service.ts` (posible)

### Configuración:
- [ ] `.env.example` (añadir variables OIDC)
- [ ] `package.json` (nuevas dependencias)

### Frontend:
- [ ] Componente de login (añadir botón OIDC)
- [ ] `apps/client/src/app/pages/auth/auth-page.component.ts` (manejo de errores)

### Documentación:
- [ ] `DEVELOPMENT.md` (instrucciones de configuración OIDC)
- [ ] `CHANGELOG.md` (documentar nueva feature)
- [ ] `README.md` (mencionar soporte OIDC)

---

## 🎯 Próximos Pasos Inmediatos

1. **Comenzar Fase 2**: Modificar schema de Prisma
2. **Instalar dependencias**: passport-openidconnect
3. **Crear estrategia OIDC**: Implementar oidc.strategy.ts

---

## 🔧 Consideraciones Técnicas

### Ventajas de este enfoque:
✅ Mínima invasión en código existente
✅ Aprovecha arquitectura Passport ya establecida
✅ Flexible para cualquier proveedor OIDC
✅ Coexiste con métodos de autenticación actuales
✅ Fácil de mantener y extender
✅ Bien documentado y testeable

### Posibles desafíos:
⚠️ Configuración puede ser compleja para usuarios finales
⚠️ Diferentes proveedores OIDC tienen quirks específicos
⚠️ Testing requiere configuración de provider de desarrollo
⚠️ Manejo de múltiples issuers añade complejidad

### Alternativas consideradas:
- **OAuth2 específico por proveedor**: Más trabajo, menos flexible
- **Auth0/Keycloak como único proveedor**: Limita opciones de usuarios
- **Passport-oauth2 genérico**: OIDC es más estándar y específico

---

## 📚 Referencias

### Documentación relevante:
- [OpenID Connect Specification](https://openid.net/connect/)
- [Passport-OpenIDConnect Strategy](https://github.com/jaredhanson/passport-openidconnect)
- [NestJS Passport Integration](https://docs.nestjs.com/security/authentication)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

### Proveedores OIDC para testing:
- [Keycloak (self-hosted)](https://www.keycloak.org/)
- [Auth0](https://auth0.com/)
- [Azure AD](https://azure.microsoft.com/en-us/services/active-directory/)
- [Okta](https://www.okta.com/)

---

## 📞 Contacto y Soporte

Para preguntas o problemas durante la implementación:
- Revisar logs en `apps/api/src/app/auth/oidc.strategy.ts`
- Verificar configuración de variables de entorno
- Consultar documentación del proveedor OIDC específico

---

**Última actualización**: 3 de noviembre de 2025
**Versión del plan**: 1.0
```
