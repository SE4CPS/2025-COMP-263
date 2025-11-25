Lessons Learned from Lab 5

1. Migrating Structured SQL Data Into NoSQL Documents
   This lab made clear how shifting from tidy SQL tables to standalone NoSQL docs reshapes how we handle data. Instead of splitting info across linked tables - say, sensors paired with their readings - you pull it together yourself. With tools like map(), filter(), and reduce(), I pieced the bits into one compact JSON chunk per item. Now every entry holds both sensor details and its matching measurement, no extra steps needed later.
   This creates docs built for reading fast since everything you need sits in a single item - queries don't have to link stuff on the fly - which works well with spread-out NoSQL setups. The task showed one reason folks lean on NoSQL when speed matters: it simplifies lookups while allowing growth across machines.


2. Metadata as the Foundation of Data Traceability and Quality
   Putting detailed labels on every file showed just how useful those details can be when handling live data flows. Labels like unique IDs, verification codes, source history, group numbers, time stamps for intake, or measurement types make it possible to track each record straight to where it started.
   I figured out that metadata makes sure
   Auditing lets you check exactly when a file appeared - also see the way it was made.
   Truth: These codes show if info changed by mistake or got damaged - so you know it’s safe.
   Reproducibility means you can follow where data’s been - using things like device ID or time stamps - to see how it moves from one system to another.
   When numbers look off, metadata shows which piece went wrong - could be the sensor feeding it, the data chunk, or how it was changed.
   Data works better together when units plus labels stay clear - so everyone sees the same thing, no matter where they're working.
   Data details work like notes within info, helping solid checks plus rule-following across split setups.


3. Shard-Key Design and Its Impact on Performance & Scalability
   Sharding turns big databases into manageable chunks. With a key such as {farmId + day}, every piece holds info tied to one farm on one day. Because of this split, writes spread out - not just by location but also by when they happen. That way, no single chunk gets overloaded with updates.
   Through this exercise I learned:
   A solid shard key balances load fairly - yet groups similar info close. It avoids hotspots but still links connected pieces somehow. Distribution stays smooth without splitting up what belongs together.
   A poor shard choice - like steadily rising timestamps - pushes every write to a single chunk, swamping it.
   How you pick a shard key affects speed, performance, capacity - think Cassandra, MongoDB, DynamoDB. Different choices change how well the system scales sideways. It shapes response times across distributed setups. The wrong setup slows everything down. Picking right means smoother handling of growing loads.
   This experiment made one thing obvious: splitting data isn't merely about setting up storage - it's tied to how you structure information, shaping whether things run smooth when traffic hits. What matters most? The way pieces are organized affects speed and stability once pressure builds.
