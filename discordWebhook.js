const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
const botName = process.env.DISCORD_BOT_NAME || 'Clepsydre';

async function postToDiscord(embed) {
  if (!discordWebhookUrl) return false;
  try {
    const res = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: botName,
        embeds: [embed]
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Erreur Webhook Discord:', err.message);
    return false;
  }
}

function maskKey(key) {
  if (!key) return '';
  const parts = String(key).split('-');
  if (parts.length <= 2) return key;
  return `${parts[0]}-****-****-${parts[parts.length - 1]}`;
}

/**
 * Notifie l'activation d'une machine (première activation, réactivation post-déliement, ou machine additionnelle)
 */
async function notifyNewMachineActivation({ license, machineId, appVersion, activationType = 'first' }) {
  const shortHwid = machineId ? machineId.substring(0, 12) + '...' : 'Inconnu';
  
  let title = '🎉 Première activation de licence !';
  let color = 0x10B981; // Vert Émeraude
  let description = "La licence vient d'être activée en jeu pour la toute première fois.";

  if (activationType === 'reactivation') {
    title = '🔄 Réactivation de licence (Machine reliée)';
    color = 0x38BDF8; // Bleu Cyan
    description = "La machine a été reliée avec succès suite à un déliement de l'ordinateur.";
  } else if (activationType === 'additional') {
    title = '💻 Machine supplémentaire reliée';
    color = 0x8B5CF6; // Violet
    description = "Une nouvelle machine autorisée a été rattachée à cette licence.";
  }

  const expirationText = license.expires_at 
    ? new Date(license.expires_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Illimitée (À vie)';

  const embed = {
    author: {
      name: `${botName} • Système de Licences`
    },
    title,
    description,
    color,
    fields: [
      { name: '👤 Client', value: `**${license.customer_name || 'Anonyme'}**`, inline: true },
      { name: '🔑 Clé', value: `\`${maskKey(license.license_key)}\``, inline: true },
      { name: '📱 Version App', value: `\`v${appVersion || '1.0.0'}\``, inline: true },
      { name: '🖥️ Machine ID', value: `\`${shortHwid}\``, inline: true },
      { name: '📊 Quota PC', value: `**${(license.machine_ids || []).length} / ${license.max_devices || 1} PC**`, inline: true },
      { name: '⏳ Expiration', value: `**${expirationText}**`, inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `${botName} • Comte Harebourg` }
  };

  return postToDiscord(embed);
}

/**
 * Notifie lorsqu'un joueur tente d'utiliser une clé sur un PC au-delà de son quota max_devices
 */
async function notifyDeviceLimitReached({ license, machineId, appVersion }) {
  const shortHwid = machineId ? machineId.substring(0, 12) + '...' : 'Inconnu';
  const embed = {
    author: {
      name: `${botName} • Sécurité Licences`
    },
    title: '⚠️ Dépassement de quota de machines',
    color: 0xF59E0B, // Ambre / Orange
    description: `Un joueur a tenté d'activer cette licence sur un nouvel ordinateur alors que le quota maximal (**${license.max_devices || 1} PC**) est déjà atteint.`,
    fields: [
      { name: '👤 Client', value: `**${license.customer_name || 'Anonyme'}**`, inline: true },
      { name: '🔑 Clé', value: `\`${maskKey(license.license_key)}\``, inline: true },
      { name: '🖥️ Machine rejetée', value: `\`${shortHwid}\``, inline: true },
      { name: '📱 Version App', value: `\`v${appVersion || '1.0.0'}\``, inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `${botName} • Comte Harebourg` }
  };
  return postToDiscord(embed);
}

/**
 * Test du webhook
 */
async function notifyTestWebhook() {
  const embed = {
    author: {
      name: `${botName} • Système de Licences`
    },
    title: `🔔 ${botName} est opérationnel !`,
    description: `Le Webhook Discord est parfaitement connecté. Les alertes d'activation et de gestion des licences apparaîtront dans ce salon.`,
    color: 0x10B981,
    fields: [
      { name: 'Statut', value: '🟢 En ligne & Connecté', inline: true },
      { name: 'Infrastructure', value: '🔒 Sécurisée', inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `${botName} • Comte Harebourg` }
  };
  return postToDiscord(embed);
}

module.exports = {
  isDiscordConfigured: () => Boolean(discordWebhookUrl),
  notifyNewMachineActivation,
  notifyDeviceLimitReached,
  notifyTestWebhook
};
