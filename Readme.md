Ultimate
========

Simulation of ultimate frisbee.

ML TODO
-------

- Enrich with throwing examples

Known Bugs
----------

- Throwing the disk then trying to catch it yourself (RandomOffense + ClosestPickup)
- Poor routes to incoming disk
- Poor interception prediction (should incorporate velocity), offense + defense

Backlog
-------

- Better route to incoming disk
- Better behavior than "charge" when teammate is picking up disk
- Stack (vert, ho)
- Visual improvements
  - Add permanent scoreboard, game over message
  - Render players with shadows
  - Render possessing player with ring
  - Show "spot" when player catches near out-of-bounds or endzone
- Audio improvements
  - Sounds effects, incl. crowd
  - Background music
- Asset improvements
  - Better player sprites
  - Special sprites for handling
  - Sprites for diving, jumping
  - Better field sprite
  - Add stands, cheerleaders, etc
- Thrower behavior
  - React to stall count?
  - Different throw types, incl. release positions offset
  - Pump fake?
- Cutter behavior
  - React to stall count
  - Dump cut
  - Rest?
  - Clear the lane?
