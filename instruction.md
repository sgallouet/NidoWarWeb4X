# NidoWarWeb4X 

## Rule of the game

- Isometric 3/4 angle tile world map including towns, armies, ressource and terrains
- Turn by turn 4X game with limited movement and action in the world map for each turn
- Each armies consist of a hero leader (which have the empire flag) and units (or multiple hero) - in the world map we only see the hero
- Attacking another armie consist on moving into their tie and enfellow as such :
    - Game zoom into the 9 tiles surrounding the attcked tile -the others tiles become blac&white - in the center is the army being attacked
    - All armies present in the 9 tiles would be there
    - Each tiles have a subdivision of 4 sub tile, with each subtile having one of the unit group / heroes in user pre configred formation 
        - the attacker can choose to change his formation
    - Eeach team can battle each other like traditional 4x game with
        - a team can try to retreat by moving to a border when its turn start before doing any other action
        - first turn is given to the attacker
- Capturing ressources such as mine or market provide gold on a regular turn schedule
    - On pay turn a merchant is spawn to transport the gold to the nearest castle or town at a speed of 3 tile/turn
        - this merchant can overlap existing friendly unit
    - Army can be stationned at ressource for protection as well as merchant protection
    - Enemy can capture the merchant, in that event the merchant will try to go the enemy cloest castle or town
- Consumable ressources such a treasure chest can be collected
- There is a fog of war at the start of the game
- Defensive structure can be built and join the fight such as tower, wall and doors
- Forest can hide enemies unless one tile apart but reduce movement by 50%
- Archer are 30% less damage when attacking forest tile
- Castle can be captured by staying 3 days on top of it after defeating the army
- Castle can build new units if the correct building was constructed first
- Town generate +1 population point per week, when an army enter a town they can growth +1 at the end of the turn for each population point the town have.
- Each day have 5 turn : 6am, 1pm, 4pm, 8pm, 1am


## Code design

- Web app intended to work for phone and tablet
- Build for performance first :
    - Main thread should be moslty free, anything than can be done async should be async
        - any gameplay, calculation, AI thinking and any other process which can be delayed few frame should be out of the frame pass 
    - Only render what is shown to the screen
- Small code is the best, small files are the best
    - No melting spot, things like index.html should only be few lines that import.
    - Any files more than 1k rows is a red flag that we didnt follow the design
    - Everything should be very well seggregated
    - Serggregation should be between engine, gameplay and universe. With univers being like folder for castles, for tiles, for units etc... with each element its own folder with drawing and interface implementations etc...
    - No bloating, no mixing

## Instruction handling

- If i give special instructions on how to do something , make sure to create a codex skill so that i don't need to be that precise next time. 
    - Keep all skills very small with the minimum information needed to be consistent
- If you are unsure about anything ask a question, do not assume
- This strategically ahead as a good developers who care to have a very easy to manage project even after years of adding new requirements and items in the code
- Think about all the optimization that Unity and UE4 have for 2D rendering, such as minimizing draw call, culling, memory, sprite size, format/compression

## Art

- All graphics will be sprites or spritesheet
    - The art generated will be badly inconsistent and require a generic interface before reading it
        - a json interface which ditctate
            - frame as rectangular boundaries
            - a center for each frame
            - frame order for spritesheet
            - rectangular rendering scalar factor (which decide the size it will be in the game as each frame could come in different size)
            - frame timing in ms (0 if its a still frame)
    - The art provided will always be transparent, if it was missed then ask the user to provide again - do not try create the transparent version yourself, the user have a much better tool that give better results
- UI should be minimal with beautiful retro J-RPG and especially as little text as possible
- All art should be smartphone friendly, low detail but crisp, strong lining delimiter, simple shading, light in props, contrasted  vivid poetic color like a japanese animation





