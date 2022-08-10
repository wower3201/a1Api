import { world } from "mojang-minecraft";
/**
 * Minecraft Bedrock Gametest Database
 * @license MIT
 * @author a1Piolpolars 
 * @version 1.0.0
 * --------------------------------------------------------------------------
 * This database stores data on players inside a objective
 * Each objective can only store 32768 string data inside its players
 * So we split up the save and save it across chunks in multiple objectives
 * --------------------------------------------------------------------------
 */

/**
 * The max string size of a objective, 32768 is max NBT
 */
const MAX_DATABASE_STRING_SIZE = 32000;

/**
 * Splits a string into chunk sizes
 * @param {string} str string to split
 * @param {number} length length of string
 * @returns {Array<string>}
 */
function chunkString(str, length) {
  return str.match(new RegExp(".{1," + length + "}", "g"));
}

/**
 * Runs a Command
 * @param {string} command a minecraft /command
 * @param {string} dimension: "overworld" | "nether" | "the end"
 * @param {boolean} debug: true console logs the command, else it runs command
 * @example runCommand(`say test`)
 */
function runCommand(command, dimension = "overworld", debug = false) {
  try {
    return debug
      ? console.warn(JSON.stringify(runCommand(command)))
      : world.getDimension(dimension).runCommand(command);
  } catch (error) {
    console.warn(error + error.stack);
    return { error: true };
  }
}

/**
 * Convert string to binary
 * @param {String} text you want to trasnslate to binary
 * @returns {String}
 */
function textToBinary(text) {
  return text
    .split("")
    .map((char) => {
      return char.charCodeAt(0).toString(2);
    })
    .join(" ");
}
/**
 * Convert binary to string
 * @param {String} binary the binary that you want converted
 * @returns {String}
 */
function binaryToText(binary) {
  return binary
    .split(" ")
    .map((char) => {
      return String.fromCharCode(parseInt(char, 2));
    })
    .join("");
}

export class Database {
  constructor(TABLE_NAME) {
    this.TABLE_NAME = TABLE_NAME;
    this.MEMORY = [];
    this.build();
    this.fetch();
  }

  fetch() {
    try {
      for (let i = 0; i <= this.SAVE_NAMES; i++) {
        const name = `DB_${this.TABLE_NAME}_${i}`;
        const regex = new RegExp(`(?<=${name}\\()[0-1\\s]+(?=\\))`);
        const RAW_TABLE_DATA = this.SCOREBOARD_DATA.match(regex)[0];
        this.MEMORY.push({ index: i, data: `${RAW_TABLE_DATA}` });
      }
    } catch (error) {
      this.MEMORY = [{ index: 0, data: "01111011 01111101" }];
    }
  }

  build(objective = this.TABLE_NAME) {
    runCommand(`scoreboard objectives add ${objective} dummy`);
    runCommand(`scoreboard players add "DB_SAVE" ${objective} 0`);
  }

  wipe() {
    this.MEMORY = [];
    for (let i = 0; i <= this.SAVE_NAMES; i++) {
      const name = `DB_${this.TABLE_NAME}_${i}`;
      runCommand(`scoreboard objectives remove ${name}`);
    }
    runCommand(`scoreboard objectives remove ${this.TABLE_NAME}`);
    this.build();
  }

  get SCOREBOARD_DATA() {
    return world.getDimension("overworld").runCommand(`scoreboard players list`)
      .statusMessage;
  }

  get SAVE_NAMES() {
    try {
      const command = world
        .getDimension("overworld")
        .runCommand(
          `scoreboard players test "DB_SAVE" "${this.TABLE_NAME}" * *`
        );
      return parseInt(command.statusMessage.split(" ")[1]);
    } catch (error) {
      return 0;
    }
  }

  set SAVE_NAMES(value) {
    world
      .getDimension("overworld")
      .runCommand(
        `scoreboard players set "DB_SAVE" "${this.TABLE_NAME}" ${value}`
      );
  }
  /**
   * Gets the database from the world
   * @returns {JSON}
   */
  get data() {
    try {
      const data = this.MEMORY.map((a) => binaryToText(a.data));
      return JSON.parse(data.join(""));
    } catch (error) {
      return {};
    }
  }

  /**
   * Saves local memory data to database
   * @param {JSON} json value to save to DB
   */
  save(json) {
    const SPLIT_DATA = chunkString(
      JSON.stringify(json),
      MAX_DATABASE_STRING_SIZE
    );
    this.wipe();
    for (const [index, chunk] of SPLIT_DATA.entries()) {
      const name = `DB_${this.TABLE_NAME}_${index}`;
      this.SAVE_NAMES = index;
      const data = textToBinary(chunk);
      this.MEMORY.push({
        index: index,
        data: data,
      });
      runCommand(`scoreboard objectives add ${name} dummy`);
      runCommand(`scoreboard players set "${name}(${data})" ${name} 0`);
    }
  }

  get(key) {
    const data = this.data;
    return data[key];
  }

  set(key, value) {
    let data = this.data;
    data[key] = value;
    this.save(data);
  }
  /**
   * Check if the key exists in the table
   * @param {string} key
   * @returns {boolean}
   * @example Database.has('Test Key');
   */
  has(key) {
    return this.keys().includes(key);
  }
  /**
   * Delete the key from the table
   * @param {string} key
   * @returns {boolean}
   * @example Database.delete('Test Key');
   */
  delete(key) {
    let json = this.data;
    const status = delete json[key];
    this.save(json);
    return status;
  }
  /**
   * Returns the number of key/value pairs in the Map object.
   * @example Database.size()
   */
  size() {
    return this.keys().length;
  }
  /**
   * Clear everything in the table
   * @example Database.clear()
   */
  clear() {
    this.save({});
  }
  /**
   * Get all the keys in the table
   * @returns {Array<string>}
   * @example Database.keys();
   */
  keys() {
    return Object.keys(this.data);
  }
  /**
   * Get all the values in the table
   * @returns {Array<any>}
   * @example Database.values();
   */
  values() {
    return Object.values(this.data);
  }
  /**
   * Gets all the keys and values
   * @returns {any}
   * @example Database.getCollection();
   */
  getCollection() {
    return this.data;
  }
}

export class CommandBuilder {
    constructor() {
      this.prefix = ".";
      this._registrationInformation = [];
    }
    /**
     * Register a command with a callback
     * @param {registerInformation} register An object of information needed to register the custom command
     * @param {(data: BeforeChatEvent, args: Array<string>) => void} callback Code you want to execute when the command is executed
     * @example import { Server } from "../../Minecraft";
     *  Server.commands.register({ name: 'ping' }, (data, args) => {
     *  Server.broadcast('Pong!', data.sender.nameTag);
     * });
     */
    register(register, callback) {
      this._registrationInformation.push({
        private: register.private ? true : false,
        cancelMessage: register.cancelMessage ? true : false,
        name: register.name.toLowerCase(),
        aliases: register.aliases
          ? register.aliases.map((v) => v.toLowerCase())
          : null,
        description: register.description,
        usage: register.usage,
        example: register.example ? register.example : null,
        callback,
      });
    }
    /**
     * Get a list of registered commands
     * @returns {Array<string>}
     * @example get();
     */
    get() {
      const commands = [];
      this._registrationInformation.forEach((element) => {
        if (element.private) return;
        commands.push(element.name);
      });
      return commands;
    }
    /**
     * Get all the registered informations
     * @returns {Array<storedRegisterInformation>}
     * @example getAllRegistration();
     */
    getAllRegistation() {
      return this._registrationInformation;
    }
    /**
     * Get registration information on a specific command
     * @param name The command name or alias you want to get information on
     * @returns {storedRegisterInformation}
     * @example getRegistration('ping');
     */
    getRegistration(name) {
      const command = this._registrationInformation.some(
        (element) =>
          element.name.toLowerCase() === name ||
          (element.aliases && element.aliases.includes(name))
      );
      if (!command) return;
      let register;
      this._registrationInformation.forEach((element) => {
        if (element.private) return;
        const eachCommand =
          element.name.toLowerCase() === name ||
          (element.aliases && element.aliases.includes(name));
        if (!eachCommand) return;
        register = element;
      });
      return register;
    }
  }
  export const CommandBuild = new CommandBuilder();
  
 /**
   * Broadcast a message in chat
   * @param {string} text Message or a lang code
   * @param {string} player Player you want to broadcast to
   * @param {Array<string>} with_ lang arguments
   * @returns {any} For commands that return data, returns a JSON structure with command response values.
   * @example broadcast('Hello World!');
   */
  broadcast(text, player, args = []); {
    try {
      args = args.map(String).filter((n) => n);
      return SA.build.chat.runCommand(
        `tellraw ${
          player ? `"${player}"` : "@a"
        } {"rawtext":[{"translate":"${text}","with":${JSON.stringify(args)}}]}`
      );
    } catch (error) {
      return { error: true };
    }

  }

  /**
   * Runs a Command
   * @param {string} command a minecraft /command
   * @param {string} dimension: "overworld" | "nether" | "the end"
   * @param {boolean} debug: true console logs the command, else it runs command
   * @example runCommand(`say test`)
   */
   runCommand(command, dimension = "overworld", debug = false); {
    try {
      return debug
        ? console.warn(JSON.stringify(this.runCommand(command)))
        : world.getDimension(dimension).runCommand(command);
    } catch (error) {
      return { error: true };
    }
  }

  /**
   * Run an array of commands
   * @param {Array<string>} commands Put '%' before your commands. It will make it so it only executes if all the commands thta came before it executed successfully!
   * @returns {{ error: boolean }}
   * @example runCommands([
   * 'clear "a1Piolpolars" diamond 0 0',
   * '%say a1Piolpolars has a Diamond!'
   * ]);
   */
//RANKS
   world.events.beforeChat.subscribe((data) => {
     try {
       return (
         (data.cancel = true),
         world.getDimension("overworld").runCommand(
           `tellraw @a {"rawtext":[{"text":"§l§8[§r${
             data.sender
               .getTags()
               .find((tag) => tag.startsWith("rank:"))
               ?.substring(5)
               ?.replaceAll("--", "§r§l§8][§r") ?? "§aMember"
           }§l§8]§r §7${data.sender.nameTag}:§r ${data.message}"}]}`
         )
       );
     } catch (error) {
       return (data.cancel = false), console.warn(`${error}, ${error.stack}`);
     }
   });


/**
 * Register a tick timeout
 * @param {(data: BeforeChatEvent, args: Array<string>) => void} callback Code you want to execute when the command is executed
 * @param {number} tick time in ticks you want the return to occur
 * @example
 *  SA.TickTimeOutBuild.setTickTimeout(function () {
 *    console.log(`callback`)
 * });
 */
 export function setTickTimeout(callback, tick) {
    new tickTimeout(callback, tick);
  }
  /**
   * Delay executing a function, REPEATEDLY
   * @param {(data: BeforeChatEvent, args: Array<string>) => void} callback Code you want to execute when the command is executed
   * @param {number} tick time in ticks you want the return to occur
   * @returns {number}
   */
  export function setTickInterval(callback, tick) {
    new tickTimeout(callback, tick, true);
  }
  class tickTimeout {
    /**
     * Register a timeout
     * @param {(data: BeforeChatEvent, args: Array<string>) => void} callback Code you want to execute when the command is executed
     * @param {number} time time in Date want the function to run
     */
    constructor(callback, tick, loop = false) {
      this.tickDelay = tick;
      this.callbackTick = 0;
      this.loop = loop;
  
      let TickCallBack = world.events.tick.subscribe((data) => {
        if (this.callbackTick == 0) {
          this.callbackTick = data.currentTick + this.tickDelay;
        }
        try {
          if (this.callbackTick <= data.currentTick) {
            // return callback
            callback();
            if (this.loop) {
              this.callbackTick = data.currentTick + this.tickDelay;
            } else {
              world.events.tick.unsubscribe(TickCallBack);
            }
          }
        } catch (error) {
          console.warn(`${error} : ${error.stack}`);
        }
      });
    }
  }

/**
 * Returns a location of the inputed aguments
 * @param {string} x x agument
 * @param {string} y y agument
 * @param {string} z z agument
 * @param {Array<number>} location player.location used
 * @param {Array<number>} viewVector player.viewVector used
 * @returns {Location}
 * @example parseLocationAugs(["~1", "3", "^7"], { location: [1,2,3] , viewVector: [1,2,3] })
 */
 function parseLocationAugs([x, y, z], { location, viewVector }) {
    if (!x || !y || !x) return new Error("Undefined Input");
    const a = [x, y, z].map((arg) => {
      const r = parseInt(arg.replace(/\D/g, ""));
      return isNaN(r) ? 0 : r;
    });
    const b = [x, y, z].map((arg, index) => {
      return arg.includes("~")
        ? a[index] + location[index]
        : arg.includes("^")
        ? a[index] + viewVector[index]
        : a[index];
    });
    return new Location(b[0], b[1], b[2]);
  }

  import { BlockLocation } from "mojang-minecraft";
  export class PlayerBuilder {
    /**
     * Get list of players in game
     * @returns {Array<string>}
     * @example PlayerBuilder.list();
     */
    list() {
      let data = [];
      data = world.getDimension("overworld").runCommand(`list`).players.split(", ");
      return data;
    }
    /**
     * Look if player is in the game
     * @param {string} player Player you are looking for
     * @returns {boolean}
     * @example PlayerBuilder.has('notbeer');
     */
    has(player) {
      const players = this.list();
      return players.includes(player);
    }
    /**
     * Fetch an online players data
     * @param player
     * @returns {Player}
     */
    fetch(player) {
      for (const p of world.getPlayers())
        if (player && p.name === player) return p;
    }
    /**
     * Get tags player(s) has
     * @param {string} playerName Requirements for the entity
     * @returns {Array<string>}
     * @example getTags('Smell of curry');
     */
    getTags(playerName) {
      const player = this.fetch(playerName);
      return player.getTags();
    }
    /**
     * Look for a tag on player(s)
     * @param {string} tag Tag you are seraching for (WARNING: Color Coding with § is ignored)
     * @param {string} playerName Requirements for the entity
     * @returns {boolean}
     * @example hasTag("Owner", 'Smell of curry');
     */
    hasTag(tag, playerName) {
      const player = this.fetch(playerName);
      return player.hasTag(tag);
    }
    /**
     * Remove a tag from a player
     * @param {string} tag Tag you are seraching for (WARNING: Color Coding with § is ignored)
     * @param {string} playerName Requirements for the entity
     * @returns {boolean}
     * @example removeTag("Owner", 'Smell of curry');
     */
    removeTag(tag, playerName) {
      const player = this.fetch(playerName);
      return player.removeTag(tag);
    }
    /**
     * Get Players Position
     * @param {string} playerName Valid player name
     * @returns {Array{x,y,z}}
     * @example PlayerBuilder.getPos('Smell of curry');
     */
    getPos(playerName) {
      const player = this.fetch(playerName);
      return {
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
      };
    }
    /**
     * Get the amount on a specific items player(s) has
     * @param {string} itemIdentifier Item you are looking for
     * @param {number} [itemData] Item data you are looking for
     * @param {string} [player] Player you are searching
     * @returns {Array<getItemCountReturn>}
     * @example PlayerBuilder.getItemCount('minecraft:diamond', '0', 'notbeer');
     */
    getItemCount(itemIdentifier, itemData, player) {
      let itemCount = [];
      const data = world.getDimension("overworld").runCommand(
        `clear "${player}" ${itemIdentifier} ${itemData ? itemData : "0"} 0`
      );
      if (data.error) return itemCount;
      data.playerTest.forEach((element) => {
        const count = parseInt(element.match(/(?<=.*?\().+?(?=\))/)[0]);
        const player = element.match(/^.*(?= \(\d+\))/)[0];
        itemCount.push({ player, count });
      });
      return itemCount ? itemCount : [];
    }
    /**
     * Get players score on a specific objective
     * @param {string} objective Objective name you want to search
     * @param {string} player Requirements for the entity
     * @param {number} [minimum] Minumum score you are looking for
     * @param {number} [maximum] Maximum score you are looking for
     * @returns {number}
     * @example PlayerBuilder.getScore('Money', 'notbeer', { minimum: 0 });
     */
    getScore(objective, player, { minimum, maximum } = {}) {
      try {
        const data = world.getDimension("overworld").runCommand(
          `scoreboard players test "${player}" ${objective} ${
            minimum ? minimum : "*"
          } ${maximum ? maximum : "*"}`
        );
        if (data.error) return 0;
        return parseInt(data.statusMessage.match(/-?\d+/)[0] ?? 0) ?? 0;
      } catch (error) {
        return 0;
      }
    }
  }
  export const PlayerBuild = new PlayerBuilder();


  import {
    MinecraftEnchantmentTypes,
    InventoryComponentContainer,
    EnchantmentList,
  } from "mojang-minecraft";
  
  /**
   * Minecraft Bedrock Anti Hacked Items
   * @license MIT
   * @author a1Piolpolars
   * @version 1.0.0
   * --------------------------------------------------------------------------
   * This is a anti hacked items, meaning it checks a players inventory every
   * tick then it tests if they have any banned items, then checks if they have
   * items that have hacked enchants and clears the item from inventory
   * --------------------------------------------------------------------------
   */
  
  world.events.tick.subscribe((data) => {
    for (const player of world.getPlayers()) {
      /**
       * @type {InventoryComponentContainer}
       */
      const container = player.getComponent("minecraft:inventory").container;
      for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;
        /**
         * @type {EnchantmentList}
         */
        const enchantments = item.getComponent("enchantments").enchantments;
        let change = false;
        for (const Enchantment in MinecraftEnchantmentTypes) {
          const ItemEnchantment = enchantments.getEnchantment(
            MinecraftEnchantmentTypes[Enchantment]
          );
          if (!ItemEnchantment) continue;
          const remove = () => {
            enchantments.removeEnchantment(ItemEnchantment.type);
            change = true;
          };
          if (enchantments.slot == 0) {
            if (!enchantments.canAddEnchantment(ItemEnchantment)) remove();
          } else {
            if (ItemEnchantment.level > ItemEnchantment.type.maxLevel) remove();
          }
        }
        if (!change) continue;
        item.getComponent("enchantments").enchantments = enchantments;
        container.setItem(i, item);
      }
    }
  });

  /**
  * Minecraft Bedrock Anti Nuker
  * @license MIT
  * @author a1Piolpolars
  * @version 1.0.0
  * --------------------------------------------------------------------------
  * This anti nuker works by loging everytime a player breaks a block
  * Then the next time they break a block it tests the time from now to then
  * And if they broke a block in 50 miliseconds than we place that block back
  * --------------------------------------------------------------------------
  */
 
 /** 
  * The log of the players break times
  * @type {Object<Player.name: number>}
  */
 const log = {};
 
 /**
  * The tag that bypasses this check
  * @type {string}
  */
 const byPassTag = "staff";
 
 world.events.blockBreak.subscribe(
   ({ block, brokenBlockPermutation, dimension, player }) => {
     const old = log[player.name];
     log[player.name] = Date.now();
     if (old < Date.now() - 50 || player.hasTag(byPassTag)) return;
     dimension
       .getBlock(block.location)
       .setPermutation(brokenBlockPermutation.clone());
     dimension
       .getEntitiesAtBlockLocation(block.location)
       .filter((entity) => entity.id === "minecraft:item")
       .forEach((item) => item.kill());
   }
 );
 
 world.events.playerLeave.subscribe((data) => delete log[data.playerName]);

 import {
    BlockLocation,
    Location,
    MinecraftBlockTypes,
  } from "mojang-minecraft";
  
  /**
   * Minecraft Bedrock Anti Reach
   * @license MIT
   * @author Smell of curry
   * @author Visual1mpact
   * @version 1.0.0
   * --------------------------------------------------------------------------
   * Detect players who are reaching and autmaticly cancel that action
   * Works with block placing, block interacting, block destroying, and hurting
   * entitys. tests by using 7 block max reach distance
   * --------------------------------------------------------------------------
   */
  
  /**
   * Max reach limit for players in minecraft
   */
  const MAX_REACH_LIMIT = 7;
  
  /**
   * Caculates the distance from one pos to another and tests if its greater than max
   * @param {Location | BlockLocation} p1
   * @param {Location | BlockLocation} p2
   * @returns {Boolean} if it was reach
   */
  function isReach(p1, p2) {
    return (
      Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2) >
      MAX_REACH_LIMIT
    );
  }
  
  world.events.beforeItemUseOn.subscribe((data) => {
    if (!isReach(data.source, data.blockLocation)) return;
    // flagged
    data.cancel = true;
  });
  
  world.events.blockBreak.subscribe((data) => {
    if (!isReach(data.player.location, data.block.location)) return;
    // flagged
    data.dimension
      .getBlock(data.block.location)
      .setPermutation(data.brokenBlockPermutation);
  });
  
  world.events.blockPlace.subscribe((data) => {
    if (!isReach(data.player.location, data.block.location)) return;
    // flagged
    data.dimension
      .getBlock(data.block.location)
      .setPermutation(MinecraftBlockTypes.air);
  });
  
  world.events.entityHit.subscribe((data) => {
    if (data.hitEntity) {
      if (!isReach(data.entity.location, data.hitEntity.location)) return;
    } else if (data.hitBlock) {
      if (!isReach(data.entity.location, data.hitBlock.location)) return;
    } else {
      return;
    }
    //flagged
    // do something here maybe flag or send a message to staff
  });

/**
 * Minecraft Bedrock Anti Crasher
 * @license MIT
 * @author a1Piolpolars
 * @version 1.0.0
 * --------------------------------------------------------------------------
 * This anti crasher works by testing if a player has reached a location
 * Horion's crasher teleports the player to 30 Million so we just test for
 * That location and if they are there we kick the player (USES: player.json)
 * --------------------------------------------------------------------------
 */

/**
 * The tag that bypasses this check
 * @type {string}
 */
 const StaffTag = "staff";

 world.events.tick.subscribe((tick) => {
   for (const player of world.getPlayers()) {
     if (player.hasTag(StaffTag)) return;
     if (
       Math.abs(player.location.x) > 30000000 ||
       Math.abs(player.location.y) > 30000000 ||
       Math.abs(player.location.z) > 30000000
     ) {
       player.runCommand(
         `kick "${player.nameTag}" You have been kicked for trying to "Crash the game", please turn off your hacks!`
       );
     }
   }
 });

/**
 * Await till world loaded to call a functiom
 * @param {(data: BeforeChatEvent, args: Array<string>) => void} callback Code you want to execute when the command is executed
 * @example
 *  onWorldLoad(function () {
 *    console.log(`world loaded`)
 * });
 */
 function onWorldLoad(callback) {
    let TickCallback = world.events.tick.subscribe((tickEvent) => {
      try {
        world.getDimension("overworld").runCommand(`testfor @a`);
        world.events.tick.unsubscribe(TickCallback);
        callback();
      } catch (error) {}
    });
  }
import { Player } from "mojang-minecraft"
/**
 * Gets the score recorded for {displayName} on {objective}
 * @param {Player} player or entity on the scoreboard
 * @param {String} objectiveId Objective Identifer to get from
 * @param {Boolean} rNull If the return should be null if its not found or 0.
 * @returns {Number} Score that Was recorded for {Player} on {Objective}
 * @example getScore(player, "objective"): number
 */
 function getScore(player, objectiveId, rNull = false) {
    try {
        return world.scoreboard.getObjective(objective)
            .getScore(player.scoreboard);
    } catch (error) {
        return rNull ? null : 0;
    }
}

import { world } from 'mojang-minecraft';
// @ts-ignore
import { ActionFormData, MessageFormData, ModalFormData } from 'mojang-minecraft-ui';
/**
 * Fetch an online players data
 * @param {string} player The player you are looking for
 * @returns {Player || nullish}
 * @example fetch('mo9ses');
 */
const fetch = (player) => {
    for (const p of world.getPlayers())
        if (player && p.name.toLowerCase() === player.toLowerCase())
            return p;
};
/**
 * @class A Action Form is simple gametest UI that has only buttons
 * @example const dc = new ActionForm(); dc.show('Mo9ses');
 * @returns Shows a simple message form to the member "Mo9ses"
 */
export class ActionForm {
    constructor() {
        this.form = new ActionFormData();
    }
    /**
     * @function setTitle Sets the title of the form
     * @param {string} text The title text
     * @example .setTitle('Server!');
     * @returns {void}
     */
    setTitle(text) {
        this.form.title(text);
    }
    /**
     * @function setBody Sets the body of the form
     * @param {string} text The body text
     * @example .setBody('Login to be able to play on this server!');
     * @returns {void}
     */
    setBody(text) {
        this.form.body(text);
    }
    /**
     * @function addButton Adds a button to the form
     * @param {string} text The button text
     * @param {string} text The icon path of the button. This is not required to add a button
     * @example .addButton('Ok!', 'textures/UI/agree');
     * @returns {void}
     */
    addButton(text, iconPath) {
        this.form.button(text, iconPath ?? undefined);
    }
    /**
     * @function send The sends the UI to a member
     * @param {string} player The member's you want to send it to
     * @param callback a asynchronous arrow function that will run after the form is filled out (Not fully if a model form).
     * @example .send('Mo9ses');
     * @returns {void}
     */
    send(player, callback) {
        this.form.show(fetch(player)).then((res) => {
            if (!callback)
                return;
            return callback(res);
            // @ts-ignore
        }).catch((err) => console.warn(err));
    }
}
/**
 * @class A Message Form is simple gametest UI that has TWO only buttons
 * @example const dc = new MessageForm(); dc.show('Mo9ses');
 * @returns Shows a simple message form to the player "Mo9ses"
 */
export class MessageForm {
    constructor() {
        this.form = new MessageFormData();
    }
    /**
     * @function setTitle Sets the title of the form
     * @param {string} text The title text
     * @example .setTitle('Server!');
     * @returns {void}
     */
    setTitle(text) {
        this.form.title(text);
    }
    /**
     * @function setBody Sets the body of the form
     * @param {string} text The body text
     * @example .setBody('ROT?');
     * @returns {void}
     */
    setBody(text) {
        this.form.body(text);
    }
    /**
     * @function setButton1 Adds the first button to the form
     * @param {string} text The button text
     * @example .setButton1('YESSSSS!');
     * @returns {void}
     */
    setButton1(text) {
        this.form.button1(text);
    }
    /**
     * @function setButton2 Adds the second button to the form
     * @param {string} text The button text
     * @example .setButton2('DOWNLOAD IT!!!');
     * @returns {void}
     */
    setButton2(text) {
        this.form.button2(text);
    }
    /**
     * @function send The sends the UI to a member
     * @param {string} player The member's you want to send it to
     * @param callback a asynchronous arrow function that will run after the form is filled out (Not fully if a model form).
     * @example .send('Mo9ses');
     * @returns {void}
     */
    send(player, callback) {
        this.form.show(fetch(player)).then((res) => {
            if (!callback)
                return;
            return callback(res);
            // @ts-ignore
        }).catch((err) => console.warn(err));
    }
}
/**
 * @class A Modal Form is a bit more advanced gametest UI that has sliders, text fields, ane much more, BUT NO BUTTONS!
 * @example const dc = new ModelForm(); dc.show('Mo9ses');
 * @returns Shows a simple ModalForm form to the player "Mo9ses"
 */
export class ModalForm {
    constructor() {
        this.form = new ModalFormData();
    }
    /**
     * @function setTitle Sets the title of the form
     * @param {string} text The title text
     * @example .setTitle('Server!');
     * @returns {void}
     */
    setTitle(text) {
        this.form.title(text);
    }
    /**
     * @function addInput Add a text box for the member to type in
     * @param {string} label The name for the text box
     * @param {string} placeHolderText The display text in the empty text box
     * @param {string} defaultValue The default text that will be in the box (Not required!)
     * @example .addImput('What is your IP?', '0.0.0.0');
     * @returns {void}
     */
    addInput(label, placeHolderText, defaultValue) {
        this.form.textField(label, placeHolderText, defaultValue ?? '');
    }
    /**
     * @function addDropdown Make a drop down menu to the form
     * @param {string} label the name of the drop down
     * @param {string[]} options The options in the drop down
     * @param {number} defaultValueIndex Where should the default value be when you first open the form
     * @example .addDropdown('Where do you live?', ['Mexico', 'America', 'Asia'], 1);
     * @returns {void}
     */
    addDropdown(label, options, defaultValueIndex) {
        this.form.dropdown(label, options, defaultValueIndex ?? 0);
    }
    /**
     * @function addSlider Add a slider that will sliiiiiiiiiiiiide on the fooooooorm!
     * @param {string} label The name of the sliiiiiiider
     * @param {number} minimumValue The smallest number for the slider
     * @param {number} maximumValue The bigest number for the slider
     * @param {number} valueStep The amount should it step each time you move it left or right
     * @param {number} defaultValue Where should it be at when you first open the UI
     * @example .addSlider('Rate ROT', 9, 10, 1, 10);
     * @returns {void}
     */
    addSlider(label, minimumValue, maximumValue, valueStep, defaultValue) {
        if (minimumValue >= maximumValue)
            throw new Error('[Forms UI Silder] Error - the Min value cannot be greater than the Max value');
        this.form.slider(label, minimumValue, maximumValue, valueStep ?? 1, defaultValue ?? ~~(maximumValue / minimumValue));
    }
    /**
     * @function addToggle Adds a on/off button to the form
     * @param {string} label Then name of the toggle switch
     * @param {boolean} defaultValue Be either on or off when they first open the form
     * @example .addToggle('Cheese?');
     * @returns {void}
     */
    addToggle(label, defaultValue) {
        this.form.toggle(label, defaultValue ?? false);
    }
    /**
     * @function addIcon Adds a icon to the form?...
     * @param {string} iconPath the image file directory where the icon is in the texture pack
     * @example .addIcon('textures/moss');
     * @returns {void}
     */
    addIcon(iconPath) {
        this.form.icon(iconPath);
    }
    /**
     * @function send The sends the UI to a member
     * @param {string} player The member's you want to send it to
     * @param callback a asynchronous arrow function that will run after the form is filled out (Not fully if a model form).
     * @example .send('Mo9ses');
     * @returns {void}
     */
    send(player, callback) {
        this.form.show(fetch(player)).then((res) => {
            if (!callback)
                return;
            return callback(res);
            // @ts-ignore
        }).catch((err) => console.warn(err));
    }
}

/**
 * Compare a array of numbers with 2 arrays
 * @param {number[]} XYZa The first set of numbers
 * @param {number[]} XYZb The second set of numbers
 * @param {number[]} XYZc The set of numbers that should between the first and second set of numbers
 * @example betweenXYZ([1, 0, 1], [22, 81, 10], [19, 40, 6]));
 * @returns {boolean}
 */
 export const betweenXYZ = (XYZa, XYZb, XYZc) => XYZc.length === XYZc.filter((c, i) => (c >= Math.min(XYZa[i], XYZb[i])) && (c <= Math.max(XYZa[i], XYZb[i]))).length;


 import { world, EntityQueryOptions, Location, Entity } from "mojang-minecraft";

 /**
  * Minecraft Bedrock Mob Stacker
  * @license MIT
  * @author a1Piolpolars
  * @version 1.0.0
  * --------------------------------------------------------------------------
  * This is a mob stacker that works by getting all entitys in the game
  * then it gets the closest mob to each entity and kills it and adds that
  * entity to the orginal entitys current stack, and on death respawns -1 stack
  * --------------------------------------------------------------------------
  */
 
 /**
  * This is a list of the mobs that will be stacked
  * to add antoher mob add a new line and write the
  * entitys ID
  */
 const STACKABLE_MOBS = [
   "minecraft:pig",
   "minecraft:sheep",
   "minecraft:cow",
   "minecraft:cod",
   "minecraft:salmon",
   "minecraft:pufferfish",
   "minecraft:silverfish",
   "minecraft:tropicalfish",
   "minecraft:cow",
   "minecraft:fox",
   "minecraft:goat",
   "mushroomcow",
   "minecraft:panda",
   "minecraft:pig",
 ];
 
 /**
  * Returns the closets entity
  * @param {Entity} entity your using
  * @param {number} maxDistance max distance away
  * @param {String} type type of entity you want to get
  * @returns {Entity | null}
  * @example getClosetEntity(Entity, 10, Entity.id, 1)
  */
 function getClosetEntity(entity, maxDistance = null, type = false) {
   let q = new EntityQueryOptions();
   q.location = entity.location;
   q.closest = 2;
   if (type) q.type = type;
   if (maxDistance) q.maxDistance = maxDistance;
   let entitys = [...entity.dimension.getEntities(q)];
   entitys.shift();
   return entitys?.[0];
 }
 
 /**
  * Returns a location of the inputed aguments
  * @param {Entity} entity your using
  * @param {string} value what you want to search for
  * @example getTagStartsWith(Entity, 2)
  */
 function getTagStartsWith(entity, value) {
   const tags = entity.getTags();
   if (tags.length === 0) return null;
   const tag = tags.find((tag) => tag.startsWith(value));
   if (!tag) return null;
   if (tag.length < value.length) return null;
   return tag.substring(value.length);
 }
 
 /**
  * Convert seconds to number like 0:00:00
  * @param {string} string The string you want to captliaze
  * @returns {string}
  */
 function capitalizeFirstLetter(string) {
   return string.charAt(0).toUpperCase() + string.slice(1);
 }
 
 /**
  * Gets the name of a entity after : in id
  * @param {String} entityName entity you want to test
  * @returns {String}
  * @example getGenericName(Entity);
  */
 function getGenericName(entityName) {
   return entityName.split(":")[1].replace(/_/g, " ");
 }
 
 /**
  * Returns the current stack of the entity
  * @param {Entity} entity your using
  * @param {number} value what stack ammount you want it to have
  * @returns {number} number of stack
  * @example getStack(Entity)
  */
 function getStack(entity) {
   const value = getTagStartsWith(entity, "stack:") ?? "1";
   return parseInt(value);
 }
 
 /**
  * Sets the stack of a entity
  * @param {Entity} entity your using
  * @param {number} value what stack ammount you want it to have
  * @example setStack(Entity, 2)
  */
 function setStack(entity, value) {
   const current_stack = getStack(entity);
   entity.removeTag(`stack:${current_stack.toString()}`);
   entity.addTag(`stack:${value.toString()}`);
   entity.addTag(`is_stacked`);
   const name = capitalizeFirstLetter(getGenericName(entity.id));
   entity.nameTag = `§b${value}x §6${name} `;
 }
 
 world.events.tick.subscribe(() => {
   for (const entity of world.getDimension("overworld").getEntities()) {
     if (!entity || !STACKABLE_MOBS.includes(entity.id)) continue;
     let ce = getClosetEntity(entity, 10, entity.id);
     if (!ce) continue;
     setStack(entity, getStack(entity) + getStack(ce));
     ce.teleport(new Location(0, -64, 0), ce.dimension, 0, 0);
     ce.kill();
   }
 });
 
 // THIS IS entityHit Right now but it should be entityHurt, once the
 // next beta is release then i will change this but there is a bug
 // that caused the entityHurt event to not send back data on death
 
 world.events.entityHit.subscribe(({ hitEntity }) => {
   if (!hitEntity || !hitEntity.hasTag("is_stacked")) return;
   if (hitEntity.getComponent("minecraft:health").current ?? 0 > 0) return;
   const stack = getStack(hitEntity);
   if (stack <= 1) return;
   const newEntity = hitEntity.dimension.spawnEntity(
     hitEntity.id,
     hitEntity.location
   );
   setStack(newEntity, stack - 1);
 });
 
  /**
   * Converts a location to a block location
   * @param {Location} loc a location to convert
   * @returns {BlockLocation}
   */
   locationToBlockLocation(loc); {
    return new BlockLocation(
      Math.floor(loc.x),
      Math.floor(loc.y),
      Math.floor(loc.z)
    );
  }

/**
 * @typedef {Object} volume
 * @property {BlockLocation} pos1 the pos1 of the volume
 * @property {BlockLocation} pos2 the pos2 of the volume
 */

/**
 * Returns an array of volume areas
 * @returns {Array<volume>}
 */
 function getVolumeAreas() {
    try {
      /**
       * @type {String}
       */
      const statusMessage = world
        .getDimension("overworld")
        .runCommand(`volumearea list all-dimensions`).statusMessage;
      return statusMessage.match(/\d+ \d+ \d+ to \d+ \d+ \d+/g).map((v) => {
        const split = v
          .split(" to ")
          .map((a) => a.split(" ").map((b) => parseInt(b)));
        return {
          pos1: new BlockLocation(split[0][0], split[0][1], split[0][2]),
          pos2: new BlockLocation(split[1][0], split[1][1], split[1][2]),
        };
      });
    } catch (error) {
      return [];
    }
  }

