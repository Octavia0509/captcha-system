const { Client, MessageAttachment, MessageEmbed } = require("discord.js"); // Importation des différents paramètres de discord.js dont nous aurons besoin

const client = new Client(); // Instanciation du Client (BOT)

const settings = {
    token: "", // TOKEN du BOT
    prefix: "", // Préfix que vous souhaitez utiliser
    channel_verification: "", // ID du channel de vérification
    log_channel: "", // ID du channel dans lequel les logs seront envoyés
    role: "", // ID du role à ajouté lorsque le membre à réussi le Captcha
    emoji_false: "", // Identification de l'émoji qui réprésentera une 'croix' ( Format : <:emoji_name:emoji_id:> )
    emoji_true: "" // Identification de l'émoji qui réprésentera une 'check' ( Format : <:emoji_name:emoji_id:> )
}

const { loadImage, createCanvas } = require("canvas") // Importation des différents paramètres de canvas dont nous aurons besoin

client.on("ready", () => {
    console.log("Online") // Petit code permettant de mettre en console le mot 'Online' pour informer que le BOT s'est bien connecté
})

client.on("guildMemberAdd", async (member) => {
    if(!member.bot) {
        return null; // Permet de ne rien renvoyer si le member est un BOT
    } else {
        member.channels.cache.get(settings.channel_verification).send(`${member}, merci de passer la vérification en envoyant \`${settings.prefix}verify\` ci-dessous ! Ensuite, suivez les étapes affichées !`)
    }
    /*
        Ce rapide code permet d'envoyer dans le channel demandé le message ci-dessus afin de lui demandé de se vérifier ! 
        --> Libre à vous d'ajouter différentes 'méthodes' après l'envoie, comme une suppresion automatique du message au bout d'un certain temps !
    */
})

client.on("message", async (message) => {

    if(message.content === `${settings.prefix}verify`) { // Si le membre envoie ce message, alors on continue :

        message.delete() // Suppression du message du membre (afin d'éviter de poluer le channel)

        if(message.channel.id === settings.channel_verification) { // Si le message est envoyé dans le channel définit dans les settings, alors on contiue :

            const code = require("randomstring").generate({
                length: 10,
                charset: "alphanumeric",
                capitalization: "uppercase"
            })
            /*
                Ce code permet de générer le code du Captcha, par le biai d'un module, tout simple d'utilisation
            */
    
            const canvas = createCanvas(700, 250); // Instanciation du Canvas
            const ctx = canvas.getContext('2d');
    
            const background = await loadImage("https://lh3.googleusercontent.com/proxy/ry8FVAeB_hnEPPa05Jmh3lAOPeB2vH79a-Q-zxwajfs_HPGoK4trapo0IsKT3JTIFmSBgSW_B_eE-hRPJIir4Scm1ePcLtgz2TnRnmVo8Xza"); // Récupération du fond pour le captcha (arrière-plan)
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height); // On ajoute l'arrière plan au canvas
    
            ctx.font = '60px Karmatic Arcade'; // Ceci permet de récupérer la police (voir le README pour voir comment l'obtenir)
            ctx.fillStyle = '#ffffff'; // Couleur du texte
            ctx.fillText(code, canvas.width / 7, canvas.height / 1.8); // Ajout du code sur le canvas, avec la couleur et la police défnie
    
            const attachment = new MessageAttachment(canvas.toBuffer(), 'canvas.png'); // Création de l'image, qui sera ajoutée sur l'embed
    
            /*
            Je vous explique pas les champs de l'EMBED ci-dessous !
                Si vous ne connaissez pas :
                --> Documentation : https://discord.js.org/#/docs/main/stable/class/MessageEmbed
            */
            let embed = new MessageEmbed()
                .setTitle("Vérification")
                .setDescription(`${message.member} ! Pour avoir accès à l'**entièreté** du serveur, vous devez passer la vérification ci-dessous ! \n\n__Comment ?__ \n> Il suffit simplement d'envoyer dans **ce salon** le code que vous voyez sur l'image ci-dessous ! \n\n:warning: Vous avez **30 secondes** pour répondre !`)
                .attachFiles(attachment)
                .setImage("attachment://canvas.png")
                .setColor("#FA0000")
                .setFooter("Le code doit être renvoyé en MAJUSCULES !")

            await message.channel.send({embed: embed}).then(async (captcha) => {

                captcha.delete({ timeout: 30000 }) // Suppression de l'embed au bout de 30 secondes, puisque le membre aura 30 secondes pour passer la vérification, une fois le message envoyé !

                const filter = m => m.author.id === message.author.id && m.channel.id === message.channel.id 
                
                /*
                Ce filtre permet de "bloquer" la réponse
                    --> m.author.id === message.author.id : le code doit être envoyé par le membre ayant envoyé le message
                    --> m.channel.id === message.channel.id ! le code doit être envoyé par le membre dans le même channel que celui du message
                */

                message.channel.awaitMessages(filter, { max: 1, time: 30000, errors: [ 'time' ] }) // Création du collecteur, c'est qui fera office de récépteur du captcha une fois envoyé 
                .then((collected) => {

                    if(collected.first().content === code) { // Si le contenu du message envoyé par le membre correspond au code, alors on continue :

                        collected.first().delete({timeout: 3000}) // Suppression du message (3 secondes)
                        message.channel.send(settings.emoji_true + " ┊ Félicitations ! **Vous avez entrer le bon code !**").then((m) => m.delete({ timeout: 5000 })) // Envoie d'un message dans le channel afin d'afficher que le membre à réussi le captcha, puis suppression du message (5 secondes)
                        message.member.roles.add(message.guild.roles.cache.get(settings.role)) // Ajout du rôle définit dans les 'settings' au membre
                        
                        let embed_valide = new MessageEmbed()
                            .setAuthor(message.member.user.username, message.member.user.displayAvatarURL({dynamic: true}))
                            .setDescription(`${message.member} à réussi le Captcha !`)
                            .addField("__Rôle ajouté :__", message.guild.roles.cache.get(settings.role), true)
                            .addField("__Code du Captcha :__", code, true)
                            .setColor("#4EF20C")

                        client.channels.cache.get(settings.log_channel).send({embed: embed_valide }) // Envoie de l'embed final dans le channel de LOG

                        // Pareil je ne vous explique pas les champs de l'embed ci-dessus, voir les lignes précédentes pour obtenir le lien de la documentation

                    } else {
                        collected.first().delete({timeout: 3000})
                        message.channel.send(settings.emoji_false + " ┊ Nope ! **Vous n'avez pas entrer le bon code !** \nVous allez être expulsé dans 5 secondes !").then((m) => m.delete({ timeout: 4750 })) // Si le membre n'envoie pas le bon code, alors on envoie un message, qui sera supprimé, puis le BOT essaie d'expulser l'utilisation
                        
                        // Création de l'embed :
                        let embed_false = new MessageEmbed()
                            .setAuthor(message.member.user.username, message.member.user.displayAvatarURL({dynamic: true}))
                            .setDescription(`${message.member} n'a pas réussi le Captcha !`)
                            .addField("__Code du Captcha :__", code, true)
                            .addField("__Code envoyé :__", collected.first().content, true)
                            .setColor("#FA0000")

                        // On lance le compte à rebours
                        setTimeout(function() {
                            if(message.member.kickable) { // Vérification si le membre peut être expulsé
                                message.member.kick() // Si le BOT peut, alors il l'expulse
                                embed_false.addField("__Expulsé :__", "**OUI**", true) // On ajoute un champ à l'embed
                            } else {
                                message.channel.send(`Impossible d'expulser cet utilisateur \nMerci de vérifier que la position de **mon rôle** est à la plus haute position dans la hiérarchie !`).then((m) => m.delete({ timeout: 5000}))
                                embed_false.addField("__Expulsé :__", "**NON**", true)
                                // Le cas échéant (le membre ne peut être expulsé), le bot envoie un message, le supprime, et ajoute un champ à l'embed
                            }
                            client.channels.cache.get(settings.log_channel).send({embed: embed_false }) // Envoie de l'embed final dans le channel de LOG
                        }, 5000)
                    }
                })
                .catch((collected) => {
                    message.channel.send(`${settings.embed_false} ┊ Le temps **est écoulé** !`).then((m) => m.delete({ timeout: 4700 })) // Si le membre n'envoie pas le code dans le temps donné (ici, 30 secondes), alors le BOT envoie ce message, puis le supprime
                    
                    // Création de l'embed :
                    let embed_false = new MessageEmbed()
                        .setAuthor(message.member.user.username, message.member.user.displayAvatarURL({dynamic: true}))
                        .setDescription(`${message.member} **n'a pas réussi le Captcha à temps !**`)
                        .setColor("#FA0000")

                    // Véfication si le membre peut être expulsé, et ajouts des champs à l'Embed
                    if(message.member.kickable) {
                        message.member.kick()
                        embed_false.addField("__Expulsé :__", "**OUI**", true)
                    } else {
                        message.channel.send(`Impossible d'expulser cet utilisateur \nMerci de vérifier que la position de **mon rôle** est à la plus haute position dans la hiérarchie !`).then((m) => m.delete({ timeout: 5000}))
                        embed_false.addField("__Expulsé :__", "**NON**", true)
                    }

                    client.channels.cache.get(settings.log_channel).send({embed: embed_false })
                })
            })
        } else {
            return null; // Si le message n'est pas envoyé dans le channel approprié, alors aucune réponse du BOT n'est donnée !
        }

    }

})

client.login(settings.token) // Connexion du BOT à l'API Discord 