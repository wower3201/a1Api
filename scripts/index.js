import { ItemCompleteChargeEvent, Player, world } from "mojang-minecraft";
import { ModalFormData, ActionFormData, MessageFormData } from "mojang-minecraft-ui"
import * as a1api from "./api.js"
const allPlayers = Array.from(world.getPlayers(), plr => plr.name)


const ui = new ModalFormData()
.title("Item giver")
.textField("Who receive the items", "Player's name")
.textField("Item's name", "Name of the item")
.slider("Item's quantity", 1, 64, 1)

world.events.beforeItemUse.subscribe(data => {
  if (data.item.id === "minecraft:compass") ui.show(data.source).then(result => {
    world.getDimension("overworld").runCommand(`give "${result.formValues[0]}" ${result.formValues[1]} ${result.formValues[2]}`)
  }
)})

const ui2 = new ModalFormData()
.title("Effects giver")
.textField("Player to give effect","Example: Steve")
.textField("Effect to give","Example: regeneration")
.slider("Seconds of effect",1, 1000, 1)
.slider("Power of effect", 1, 255, 1)
.toggle("Do not show particles", false)

world.events.beforeItemUse.subscribe(data => {
  if (data.item.id === "minecraft:paper") ui2.show(data.source).then(result => {
    world.getDimension("overworld").runCommand(`effect "${result.formValues[0]}" ${result.formValues[1]} ${result.formValues[2]} ${result.formValues[3]} ${result.formValues[4]}`)
  })
})
const ui4 = new ModalFormData()
.title ("Teleport Tool")
.textField("Player to teleport", "Example: Steve")
.icon("textures/items/compass.png")
.textField("Coordinates", "Coordinates (also can is a player)")
.toggle("Check For blocks (not valid if coordinates field is a player)", false)


world.events.beforeItemUse.subscribe(data => {
  if (data.item.id === "minecraft:nether_star") ui4.show(data.source).then(result => {
      world.getDimension("overworld").runCommand(`tp "${result.formValues[0]}" ${result.formValues[1]} ${result.formValues[2]}`)
  })
})

const ui6 = new MessageFormData()
.title("Bodeno")
.body(`${allPlayers}`)
.button1("OK")
.button2("OKK")

const ui5 = new ActionFormData()
.title("Abo")
.body("WOWW")
.button("me clicche")

world.events.beforeItemUse.subscribe(data => {
  if (data.item.id === "minecraft:lapis_lazuli") ui6.show(data.source).then(result => {
      if (result.selection === 1) {
        world.getDimension("overworld").runCommand(`say Ma chi caz "${data.source.nameTag}"`)
      }
  })
})



async function OpenFormInChat(form,sender)
{
    let viewVector = sender.viewVector;
    while (sender.viewVector.equals(viewVector)) {
        await null;
    }
    return await form.show(sender);
  }