const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || '';

async function postToDiscord(embed) {
  if (!discordWebhookUrl) return false;
  try {
    const res = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Senchi Security',
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

async function notifyNewMachineActivation({ license, machineId, appVersion, isFirst }) {
  const shortHwid = machineId ? machineId.substring(0, 12) + '...' : 'Inconnu';
  const embed = {
    title: isFirst ? '🎉 Première activation de licence !' : '💻 Nouvelle machine reliée',
    color: isFirst ? 0x10B981 : 0x38BDF8, // Vert Émeraude ou Cyan
    fields: [
      { name: '👤 Client', value: license.customer_name || 'Anonyme', inline: true },
      { name: '🔑 Clé', value: `\`${maskKey(license.license_key)}\``, inline: true },
      { name: '📱 Version App', value: `v${appVersion || '1.0.0'}`, inline: true },
      { name: '🖥️ Machine ID', value: `\`${shortHwid}\``, inline: true },
      { name: '📊 Quota PC', value: `${(license.machine_ids || []).length} / ${license.max_devices || 1}`, inline: true },
      { name: '⏳ Expiration', value: license.expires_at ? new Date(license.expires_at).toLocaleDateString('fr-FR') : 'Illimitée (À vie)', inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Senchi Sword • Sécurité' }
  };
  return postToDiscord(embed);
}

async function notifyDeviceLimitReached({ license, machineId, appVersion }) {
  const shortHwid = machineId ? machineId.substring(0, 12) + '...' : 'Inconnu';
  const embed = {
    title: '⚠️ Tentative de dépassement de limite de PC',
    color: 0xF59E0B, // Ambre
    description: `Un joueur a tenté d'activer cette licence sur un nouveau PC alors que la limite autorisée (**${license.max_devices || 1} PC**) est atteinte.`,
    fields: [
      { name: '👤 Client', value: license.customer_name || 'Anonyme', inline: true },
      { name: '🔑 Clé', value: `\`${maskKey(license.license_key)}\``, inline: true },
      { name: '🖥️ Machine rejetée', value: `\`${shortHwid}\``, inline: true },
      { name: '📱 Version', value: `v${appVersion || '1.0.0'}`, inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Senchi Sword • Sécurité' }
  };
  return postToDiscord(embed);
}

async function notifyTestWebhook() {
  const embed = {
    title: '🔔 Test du Webhook Discord réussi !',
    description: 'Les notifications automatiques de **Senchi Sword** sont bien connectées à votre salon Discord.',
    color: 0x10B981,
    fields: [
      { name: 'Statut', value: '🟢 En ligne & Opérationnel', inline: true },
      { name: 'Serveur', value: 'Render / Supabase', inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Senchi Sword Admin' }
  };
  return postToDiscord(embed);
}

module.exports = {
  isDiscordConfigured: () => Boolean(discordWebhookUrl),
  notifyNewMachineActivation,
  notifyDeviceLimitReached,
  notifyTestWebhook
};
