# Hypotenuse Rush · ריצת היתר — campaign v3

A 3D canyon journey built around **inspect a hook → compare its diagonal to your rope → launch → land → continue**. The campaign has 12 named levels, three physical crossings each, in four regions. Level completion leads to the next level; progress, checkpoints, stars and records are saved locally.

This replaces v2 after the user's 25 October feedback: three jumps were insufficient, world triangles were faint, rope length was obscure, blind option switching bypassed the decision, and presentation was weak. The campaign plan and two new mockups were committed as `527baac` before presentation changes.

Visual thesis: a coral-helmet athlete crosses layered sandstone, water terraces, sunset spires and a moonlit summit; cyan/amber measurements and the cream cable remain readable against the scene.

Content plan: close player view with a slim rope specification and compact dimension/launch strip; full flat diagrams open on demand; level completion with Next Level as primary action; a twelve-stop journey map. The region illustration is menu artwork. Actual gameplay is rendered Three.js geometry, not a generated screenshot.

Interaction thesis: clicking a neutral hook selects it without attempting; a separate Launch button or Space commits; assisted flight releases automatically and resolves actual floor contact; dust, body pose, a short chime and an optional flip give action feedback. Reduced motion removes extra body rotation, particles and camera easing; steady positional following keeps the player visible.

The slim rope badge explicitly says “אורך הכבל” with its value in metres; the accessible label, help and requested diagram explain “מהרתמה P אל הטבעת”. The cable must reach the hook; assisted momentum carries the athlete to the marked landing. Rope length is distinct from landing-platform distance. The equipment limit changes explicitly by level, so it remains visible throughout the crossing.

The selected world triangle starts at the actual harness. Cyan is the X leg, gold the vertical leg, purple the lateral leg; outlined screen strokes and large labels resist perspective/background contrast. A compact strip repeats the perpendicular quantities. A requested, dismissible paused diagram shows the same exact measurements and a right-angle marker; opening it alone preserves the first-try star. Spatial diagrams show two triangles: the floor diagonal f, then f with height. Revealing the solution is a separate explicit assistance action. The final diagonal remains unknown until calculation help or a rejected commitment reveals it.

All 36 choices offer three neutral hooks, exactly one within reach; correct slots are balanced 12/12/12. Measurements vary, including non-triples and lateral displacements. A rejected commitment stays safe and reports that attempted hook's required length, rope limit and precise shortfall. It never redirects feedback when another hook is selected. A first-try star rewards a correct unaided commitment; mistakes/help do not block progress. This discourages blind retries without claiming they are impossible.

Physics remains explicit arcade assistance: an initial impulse is solved, constant hook-directed acceleration acts for .45s, automatic release retains velocity, gravity acts until a downward floor intersection. A .65s landing celebration precedes the next choice. Rendering, camera, textures and decorative model bounds never decide distance. No typed quiz or manual aiming/release timing gates traversal.

Art uses the original local Chrome/Tripo helmet and arch, a procedurally articulated athlete, sculpted ledges/supports, clustered plants, atmospheric sky/clouds, region terrain and generated local sandstone surface material. No additional Tripo generations or credits. Generated models are static; no rig is claimed.

Human enjoyment and understanding remain judged by play, not automated completion. The implementation now supplies the substantial campaign and readable measurements requested; actual captures and remaining fidelity differences are documented in the playtest and visual review.

The latest close-view presentation follows docs/CLOSE_VIEW.md. A finite camera search anchors the player at a readable screen size and keeps the landing visible; hook choice does not rotate or zoom the scene. Some extreme spatial constructions extend beyond the close viewport: honest edge cues preserve selection, and the requested flat diagram shows the full shape. Dimension labels avoid the athlete and landing marker. The active camera follows the athlete during flight rather than returning to a distant overview.
