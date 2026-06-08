# Briefs para IA de Arte y IA de Programación

## 1. Brief completo para IA de diseño de arte

### Objetivo general
Crear todo el arte del juego `Sombra del León` en estilo pixel art retro, siguiendo referencias de `Double Dragon` y `Prince of Persia 1`.

### Estilo visual
- Pixel art 2D.
- Sprites de 32x32 o 48x48 para personajes y enemigos.
- Uso de paleta reducida: tonos oscuros, rojos, verdes y acentos en amarillo/cian.
- Fondos con varios planos y un diseño gráfico sencillo, destacando las siluetas.
- Animaciones fluidas pero simples.

### Tipos de assets a crear

#### Personajes jugables y principales
- Santiago “El León” Ríos: hero sprite sheet completo.
- Lucía “La Voz” Céspedes: sprite estático y escena.
- Mateo “Topo” Salas: sprite de apoyo.
- Adriana “La Dama” Ortiz: sprite elegante.
- El Niño: sprite pequeño de mensajero.

#### Villanos, jefes y rivales
- Comandante Marín: jefe policial.
- El Halcón: agente internacional.
- Sombra: villano misterioso.
- La Cobra: contrabandista peligrosa.
- El Porteador: semi-boss.
- El Barman: semi-boss.
- El Capataz: semi-boss.

#### Enemigos básicos
- Pandillero básico.
- Vendedor armado.
- Matón con cuchillo.
- Pistolero.
- Guardia blindado.
- Perro guardián.
- Motociclista.
- Francotirador.
- Soldado de élite.

#### Entornos / niveles
- Barrio San Ánimas: casas, calles, alcantarillas.
- Mercado nocturno.
- Calle principal con grafitis y faroles.
- Bar clandestino.
- Búnker subterráneo.
- Ruta de escape con coches y barricadas.
- Fábrica abandonada.
- Puente peligroso.
- New Horizon: calles neón.
- Almacén fronterizo.
- Club VIP.
- Azotea de torre.
- Pasaje subterráneo.
- Laboratorio clandestino.
- Cuartel del Halcón.

#### Armas y objetos
- Cuchillo corto.
- Bastón de metal.
- Pistola con siete proyectiles.
- Explosivos caseros.
- Bolsa de dinero.
- Documentos confidenciales.
- Llaves metálicas.
- Kit médico.
- Cámaras de seguridad.
- Barricadas y cajas.

#### UI y elementos de interfaz
- Menú principal.
- Selección de capítulo.
- Barra de vida.
- Contador de munición.
- Botones de ataque / salto / habilidad.
- Menú de pausa.
- Ventanas de misión.

### Requisitos de cada asset
- Formato PNG con transparencia.
- Tamaño optimizado para mobile.
- Versiones pequeñas y claras.
- Animaciones: caminar, atacar, saltar, recibir daño, morir.

### Brief de cada ambiente principal

#### Barrio San Ánimas
- Estilo urbano pobre.
- Calles angostas, paredes con grafitis, basura.
- Faroles débiles y colores cálidos.
- Elementos interactuables: cajas, barriles, rejas.

#### Mercado nocturno
- Tiendas callejeras, toldos y luces de neón.
- Mucha atmósfera nocturna.
- Mesas, cajas de frutas y puestos.

#### Calle principal
- Carros viejos, paredes con propaganda.
- Farolas y contenedores.
- Barricadas improvisadas.

#### Bar clandestino
- Interior oscuro, mesas rotas, barra con botellas.
- Iluminación cálida y humo.

#### Búnker y fábrica
- Metal oxidado, tuberías, generadores.
- Zonas industriales frías.

#### New Horizon
- Ciudad moderna con neón.
- Calles limpias, edificios altos.
- Contraste entre lujo y peligro.

#### Club VIP
- Decoración lujosa, luces brillantes y guardias.
- Mesas, barras y candelabros.

#### Pasaje subterráneo
- Túneles húmedos, cables, agua en el suelo.
- Minas, trampas y sombras.

#### Laboratorio clandestino
- Mesas con equipos, frascos y cámaras.
- Ambiente limpio pero peligroso.

#### Cuartel del Halcón
- Instalación militar moderna.
- Paneles, vigilancia y soldados.

---

## 2. Brief completo para el desarrollador / Claude Code

### Objetivo general
Construir el juego móvil `Sombra del León` en un motor 2D multiplataforma, implementando todos los sistemas principales: movimiento, combate, niveles, enemigos, jefes, UI y progresión.

### Motor recomendado
- Godot 4 como primera opción.
- Alternativa: Unity si el equipo ya conoce esa tecnología.

### Plataforma técnica
- Resolución adaptable a pantalla móvil.
- Controles táctiles con esquema claro.
- Guardado local por capítulo.
- Performance estable en dispositivos medianos.

### Funcionalidades clave

#### Menú y flujo principal
- Menú inicial con botones: Jugar, Continuar, Ajustes, Historia.
- Selección de capítulo con descripción y dificultad.
- Guardado automático al superar niveles.

#### Movilidad del personaje
- Caminar izquierda/derecha.
- Saltar.
- Ataque básico y ataque fuerte.
- Dash / esquiva opcional.
- Recepción de daño y muerte.

#### Combate
- Enemigos con IA simple: patrullar, atacar cuando el jugador está cerca.
- Distintos tipos de ataques según enemigo.
- Uso de armas con munición limitada.
- Semi-boss y jefes con patrones.

#### Niveles
- 18 niveles totales divididos en dos temporadas.
- Cada nivel debe incluir un objetivo claro.
- Checkpoints internos en niveles largos.
- Puntos de comienzo / fin.

#### Enemigos por nivel y patrones
- Enemigos básicos: atacan cuerpo a cuerpo.
- Enemigos armados: disparan a distancia.
- Montan desafíos de plataforma y combate.
- Semi-bosses con ataques únicos.
- Jefes con fases y ataques especiales.

#### Progresión y mejoras
- Sistema de puntos o moneda.
- Mejora de atributos: salud, fuerza, velocidad, defensa.
- Desbloqueo de habilidades.
- Inventario simple.

#### Dificultad y balance
- Nivel 1-3: fácil.
- Nivel 4-6: medio.
- Nivel 7-9: medio-alto.
- Temporada 2: medio-alto a muy alto.
- Finales de temporada con alto desafío.

#### Historia y escenas
- Insertar diálogos cortos antes y después de niveles clave.
- Presentación de personajes en escenas estáticas.
- Transiciones con texto y música.

### Detalle de niveles (para programación)

#### Nivel 1: Barrio de San Ánimas
- Tutorial de movimiento y ataque.
- Enemigos: pandilleros básicos.
- Misión: llegar al punto de encuentro.
- Checkpoint simple.

#### Nivel 2: Mercado nocturno
- Introduce plataformas bajas.
- Enemigos: vendedores armados.
- Objetivo: recuperar paquete.

#### Nivel 3: Calle principal
- Más obstáculos y punteo.
- Enemigos: cuchilleros y vigilantes.
- Objetivo: interceptar mensajero.

#### Nivel 4: Bar clandestino
- Combate en espacio cerrado.
- Introduce enemigos de disparo a distancia.
- Objetivo: rescatar aliado.

#### Nivel 5: Búnker de Sombra
- Introduce sigilo ligero.
- Enemigos: guardias y perros.
- Objetivo: robo de documentos.

#### Nivel 6: Ruta de escape
- Plataforma de supervivencia.
- Enemigos móviles: patrullas.
- Objetivo: escapar.

#### Nivel 7: Fábrica abandonada
- Plataformas móviles y trampas.
- Semi-boss: El Capataz.
- Objetivo: activar explosivos.

#### Nivel 8: El puente
- Obstáculos destructibles.
- Enemigos: tiradores.
- Objetivo: cruzar.

#### Nivel 9: Fortaleza de Marín
- Jefe final Comandante Marín.
- Fases: combate, explosivos, ataque final.

#### Nivel 10: Llegada al Norte
- Nuevo estilo visual.
- Enemigos: sicarios callejeros.
- Objetivo: establecer base.

#### Nivel 11: Almacén fronterizo
- Plataformas elevadoras.
- Enemigos: guardias.
- Objetivo: asegurar carga.

#### Nivel 12: Calle de neón
- Enemigos ágiles.
- Semi-boss: La Cobra.
- Objetivo: eliminar convoy.

#### Nivel 13: Club VIP
- Combate mixto.
- Enemigos: guardaespaldas.
- Objetivo: interceptar reunión.

#### Nivel 14: Azotea de torre
- Plataformas altas.
- Enemigos: francotiradores.
- Objetivo: rescatar aliado.

#### Nivel 15: Pasaje subterráneo
- Máxima oscuridad.
- Enemigos: guardias tácticos.
- Objetivo: cruzar frontera.

#### Nivel 16: Laboratorio clandestino
- Destruir evidencia con tiempo.
- Enemigos: técnicos armados.

#### Nivel 17: Cuartel del Halcón
- Enemigos de élite.
- Jefe: El Halcón.

#### Nivel 18: Confrontación final
- Combinación de mecánicas.
- Enemigos finales y escape.

### Documentación para Claude Code

#### Qué queremos lograr
- Juego móvil completo con dos temporadas.
- Player controller responsivo.
- IA de enemigos con patrones simples.
- Jefes con fases.
- UI táctil clara.
- Niveles con checkpoints.
- Guardado por capítulo.

#### Qué debe entregar la IA de programación
- Arquitectura de proyecto clara.
- Sistema de escenas / niveles.
- Controlador del jugador.
- Sistema de combate.
- Enemigos y bosses.
- Menús.
- Guardado y carga.
- Data-driven levels con JSON o recursos.

### Requisitos de calidad
- Controles suaves en pantalla táctil.
- Animaciones sincronizadas con el combate.
- Dificultad escalable.
- Feedback visual para daño, golpes y objetos.
- Soporte para móviles en horizontal y vertical (preferible horizontal).

---

## 3. Prioridades iniciales

### Para la IA de arte
1. Personaje principal y sprites de animación.
2. Enemigos básicos.
3. Entornos de nivel 1-3.
4. UI y HUD.
5. Jefes y escenas narrativas.

### Para Claude Code
1. Prototipo de controles y combate.
2. Nivel 1 jugable.
3. Menú de capítulos.
4. Guardado automático.
5. Estructura de niveles y enemigos.

---

## 4. Resumen final de entregables

### IA de diseño de arte debe entregar
- Sprites completos de personajes y enemigos.
- Tiles y fondos para niveles 1-18.
- Armas y objetos interactivos.
- UI para móviles.
- Imágenes de escenas narrativas.

### IA de programación debe entregar
- Proyecto jugable con prototipo móvil.
- Flujos de nivel y escenas.
- IA de enemigos y jefes.
- Guardado y progresión de capítulos.
- Documentación técnica del proyecto.
