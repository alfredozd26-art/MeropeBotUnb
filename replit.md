# Discord Gacha Bot - Proyecto Universitario

## Descripción General

Bot de Discord tipo gacha desarrollado por Gina y amigos para un proyecto universitario en Canadá. El bot simula un sistema de ruleta/gacha similar a juegos como Genshin Impact, donde los usuarios pueden hacer "pulls" para obtener personajes y objetos con diferentes rarezas.

## Tecnologías Utilizadas

- **Lenguaje:** JavaScript (Node.js)
- **Framework:** discord.js v14
- **Economía:** UnbelievaBoat API (unb-api) para sistema de venta de items
- **Almacenamiento:** Archivos JSON (configuración independiente por servidor)
- **Entorno:** Node.js 18+

## Cambios Recientes

### Sistema de Mini Bossfights (Noviembre 20, 2025)
- **Sistema completo de combate por turnos tipo RPG** estilo Persona 5
- **Creación de personajes:** Los usuarios pueden crear sus propios personajes de combate
  - Stats personalizables: HP, ATK, DEF, SPD, SP, Tipo elemental
  - Sistema de debilidades, resistencias y reflejos
  - Límite de stats: máximo 1000 por stat para balance
- **Bosses configurables:** Administradores pueden crear bosses únicos
  - Habilidades personalizadas con efectos y cooldowns
  - Máximo 3 habilidades por boss
  - Tipos elementales: Agi (fuego), Bufu (hielo), Zio (eléctrico), Eiga (oscuridad), Hama (luz), Curse (maldición), etc.
- **Sistema de combate interactivo:**
  - UI con botones de Discord (Atacar, Habilidad, Defender, Rendirse)
  - Combate por turnos con límite de 60 segundos por acción
  - Máximo 3 personajes por batalla
  - Máximo 3-5 sesiones simultáneas por servidor
  - Cálculo de daño con multiplicadores por tipo (weak: 1.5x, resist: 0.5x, reflect: devuelve daño)
- **Buffs y Debuffs:**
  - Modificadores de ATK, DEF, SPD
  - Duración en turnos configurable
  - Regeneración de SP cada 3 turnos
- **Sistema económico integrado:**
  - Cuota de entrada opcional (configurable con UnbelievaBoat)
  - Recompensas por victoria (configurable)
  - Cooldown de 24 horas por jugador para evitar abuso
- **Comandos nuevos:**
  - `*createchar <nombre> <HP> <ATK> <DEF> <SPD> <tipo>` - Crear personaje
  - `*editchar <personaje> <campo> <valor>` - Editar stats
  - `*editbf deb/resist/reflect <personaje> <tipo> [%]` - Configurar ventajas elementales
  - `*equip <personaje> <habilidad>` - Equipar habilidades
  - `*createboss <nombre> <HP> <ATK> <DEF> <SPD> <tipo>` - Crear boss (admin)
  - `*editboss <boss> <campo> <valor>` - Editar boss (admin)
  - `*addskillboss <boss> "<nombre>" <tipo> <daño> [efecto] [cd]` - Agregar habilidad a boss
  - `*deleteskillboss <boss> "<nombre>"` - Eliminar habilidad
  - `*enablebf` / `*disablebf` - Activar/desactivar sistema (admin)
  - `*startbf <boss> <personaje1> [personaje2] [personaje3]` - Iniciar combate
  - `*listchars` - Ver tus personajes
  - `*listbosses` - Ver bosses disponibles

### Sistema de Venta de Items con UnbelievaBoat (Octubre 19, 2025)
- **Integración con UnbelievaBoat API:** Los usuarios ahora pueden vender sus personas y objetos por dinero real en UnbelievaBoat
- **Nuevo comando `*sell`:** Vende personas y objetos (NO personajes) de tu inventario
  - Uso: `*sell <nombre> <cantidad>`
  - Ejemplo: `*sell Jack 5` (vende 5 copias de Jack)
  - Solo funciona con items tipo "persona" u "objeto"
  - Los personajes NO se pueden vender
- **Nuevo campo `price` en items:** Los administradores pueden configurar precios de venta
  - Uso: `*edititem <nombre> price <cantidad>`
  - Ejemplo: `*edititem Jack price 1000` (cada Jack se vende por 1000 monedas)
  - Solo se puede configurar precio para personas y objetos, no para personajes
- **Integración automática:** El dinero se agrega directamente a la economía de UnbelievaBoat
- **Validaciones completas:**
  - Verifica que el usuario tenga suficientes copias en su inventario
  - Verifica que el item tenga precio configurado
  - Verifica que el item sea vendible (persona/objeto)
  - Muestra mensajes de error claros si algo falla
- **Dependencias:** Requiere `unb-api` y token de UnbelievaBoat configurado

### Sistema Anti-Spam Optimizado y Comandos Slash (Octubre 2025)
- **Cooldown fijo de 5 segundos:** Sistema simple y efectivo de prevención de spam
- **Delay de 1 segundo al quitar roles:** Los tickets se quitan después de 1 segundo para evitar errores de Discord API
- **Prevención total de spam:** Imposible hacer múltiples spins con un solo ticket
- **Aplicado a todos los comandos:** `*spin`, `*spin10`, `/spin`, `/spin10`
- **Mensaje mejorado:** En lugar de "Cooldown Activo" ahora muestra "🎰 Tirada en Curso" más estético
- **Comandos slash añadidos:**
  - `/spin` - Realiza una tirada del gacha (equivalente a `*spin`)
  - `/spin10` - Realiza 10 tiradas del gacha (equivalente a `*spin10`)
  - `/oye` - Comando especial existente
- **Ambas interfaces:** Tanto comandos con prefijo `*` como slash commands `/` funcionan perfectamente

### Conversión de TypeScript a JavaScript (Octubre 2025)
- Convertido completamente de TypeScript a JavaScript puro para mejor rendimiento
- Optimizado para funcionar en Cyberpanel y servicios de hosting económicos
- Eliminadas todas las dependencias de TypeScript
- Reducido el peso y complejidad del proyecto

### Nuevo Comando: *editpulltimer
- Permite ajustar la duración de los GIFs que aparecen durante las tiradas
- Configurable en milisegundos (1000-60000ms)
- Default: 11500ms (11.5 segundos)
- Uso: `*editpulltimer 5000` para 5 segundos
- **Nota:** El cooldown anti-spam se ajusta automáticamente basado en este valor

## Características Principales

1. **Sistema de Gacha**
   - Tiradas individuales (*spin) y múltiples (*spin10)
   - Sistema de pity a los 90 pulls (garantiza SSR)
   - Sistema 50/50 para promocionales

2. **Rarezas**
   - SSR: 5★ (Super Super Raro)
   - SR: 4★ (Super Raro)
   - UR: 3★ (Ultra Raro)
   - R: 2★ (Raro)

3. **Sistema de Tokens**
   - Se otorgan al obtener duplicados
   - Canjeables por recompensas
   - Configurables por administradores

4. **Configuración por Servidor**
   - Cada servidor Discord tiene su propia configuración
   - Items, probabilidades y canjes independientes
   - GIFs personalizables para tiradas
   - Roles de ticket configurables

5. **Items Secretos (🔒)**
   - Los items secretos NO aparecen en el banner público (`*banner`)
   - Solo los administradores pueden ver el banner secreto con `*secretbanner`
   - **Probabilidad real:** Los items secretos compiten con TODOS los items del pool total
   - Ejemplo de probabilidad:
     - Item Normal A: chance 10
     - Item Normal B: chance 10
     - Item Secreto: chance 1
     - **Total pool = 21**
     - Probabilidad real del secreto = 1/21 = **4.76%** (no 100%)
   - El "100%" que aparece en `*secretbanner` solo es entre los secretos entre sí
   - Se pueden obtener en cualquier tirada normal sin hacer nada especial

## Arquitectura del Proyecto

### Almacenamiento (storage.js)
Maneja todos los datos del bot usando archivos JSON:
- `{guildId}_items.json` - Items del gacha por servidor
- `{guildId}_config.json` - Configuración del servidor
- `{guildId}_pity.json` - Contadores de pity por usuario
- `{guildId}_tokens.json` - Tokens acumulados por usuario
- `{guildId}_collectables.json` - Inventario de coleccionables
- `{guildId}_exchanges.json` - Reglas de canje
- `{guildId}_characters.json` - Personajes de combate por usuario
- `{guildId}_bosses.json` - Bosses disponibles en el servidor
- `{guildId}_common_skills.json` - Habilidades equipables

### Sistema de Comandos (index.js)
- Prefijo: `*`
- Procesamiento de argumentos
- Validación de permisos
- Sistema de confirmaciones para acciones destructivas

## Preferencias del Usuario

- **Estilo de comunicación:** Español, casual y amigable
- **Emojis:** Usar cuando sea apropiado para mantener el estilo del bot
- **Hosting preferido:** Cyberpanel (económico y accesible)
- **Usuario:** Alfred Justin (Al) desde Canadá

## Próximas Mejoras Sugeridas

1. Migrar a base de datos PostgreSQL/Supabase para mejor escalabilidad
2. Más comandos slash interactivos
3. Sistema de estadísticas y leaderboards
4. Notificaciones por DM para items especiales
5. Sistema de banners temporales con fechas de inicio/fin

## Notas de Desarrollo

- Mantener compatibilidad con Cyberpanel
- Código JavaScript puro (sin compilación)
- Optimizar para uso de recursos limitados
- Configuración simple y directa

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar el bot
npm start

# Para producción (PM2)
pm2 start index.js --name gacha-bot
```

## Variables de Entorno Requeridas

- `DISCORD_TOKEN` - Token del bot de Discord
- `UNBELIEVABOAT_TOKEN` - Token de la API de UnbelievaBoat (para sistema de venta de items)

## Estado del Proyecto

✅ Conversión a JavaScript completada
✅ Nuevo comando *editpulltimer agregado
✅ Sistema de venta de items con UnbelievaBoat implementado
✅ Campo "price" agregado a los items
✅ Comando *sell funcionando correctamente
✅ Sistema de Mini Bossfights completo implementado
✅ Combat por turnos con UI interactiva
✅ Sistema de personajes y bosses configurables
✅ Integración con UnbelievaBoat para recompensas
✅ Optimizado para Cyberpanel
✅ Sistema de almacenamiento JSON funcionando
✅ Todos los comandos funcionando correctamente
✅ Código copiado a Replit

## Equipo

Proyecto desarrollado por Gina y amigos en Canadá como parte de un proyecto universitario.
