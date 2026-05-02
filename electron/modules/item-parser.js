const RARITY_MAP = {
  0: 'normal',
  1: 'magic',
  2: 'rare',
  3: 'unique',
  4: 'gem',
  5: 'currency',
  6: 'divination',
  7: 'quest',
  8: 'prophecy',
  9: 'foil'   // relic
}

class ItemParser {
  parseStashItem(rawItem, tab) {
    const item = this.parseBaseItem(rawItem)

    item.location = {
      type: 'stash',
      tabName: tab.name || tab.n || tab.id,
      tabIndex: tab.index || tab.i,
      tabId: tab.id || tab.i,
      tabType: tab.type,
      tabColour: tab.colour || tab.metadata?.colour,
      gridPos: { x: rawItem.x, y: rawItem.y }
    }

    return item
  }

  parseCharacterItems(charData, charInfo) {
    const items = []

    // Legacy API provides everything in a single `items` array
    if (charData.items) {
      for (const rawItem of charData.items) {
        const item = this.parseBaseItem(rawItem)
        item.location = {
          type: 'character',
          characterName: charInfo.name,
          characterClass: charInfo.class,
          characterLevel: charInfo.level,
          slot: rawItem.inventoryId || 'unknown'
        }
        items.push(item)
      }
      return items
    }

    // Equipped items (OAuth API)
    if (charData.equipment) {
      for (const rawItem of charData.equipment) {
        const item = this.parseBaseItem(rawItem)
        item.location = {
          type: 'character',
          characterName: charInfo.name,
          characterClass: charInfo.class,
          characterLevel: charInfo.level,
          slot: rawItem.inventoryId || 'unknown'
        }
        items.push(item)
      }
    }

    // Inventory items (OAuth API)
    if (charData.inventory) {
      for (const rawItem of charData.inventory) {
        const item = this.parseBaseItem(rawItem)
        item.location = {
          type: 'character',
          characterName: charInfo.name,
          characterClass: charInfo.class,
          characterLevel: charInfo.level,
          slot: 'inventory'
        }
        items.push(item)
      }
    }

    // Jewels (passive tree)
    if (charData.jewels) {
      for (const rawItem of charData.jewels) {
        const item = this.parseBaseItem(rawItem)
        item.location = {
          type: 'character',
          characterName: charInfo.name,
          characterClass: charInfo.class,
          characterLevel: charInfo.level,
          slot: 'passive-tree-jewel'
        }
        items.push(item)
      }
    }

    return items
  }

  parseBaseItem(raw) {
    const rarity = RARITY_MAP[raw.frameType] || 'unknown'

    // Parse sockets
    const sockets = this.parseSockets(raw.sockets)

    // Build search text from all relevant fields
    const searchParts = [
      raw.name,
      raw.typeLine,
      raw.baseType,
      rarity,
      ...(raw.implicitMods || []),
      ...(raw.explicitMods || []),
      ...(raw.craftedMods || []),
      ...(raw.enchantMods || []),
      ...(raw.fracturedMods || []),
      ...(raw.utilityMods || []),
      sockets.total > 0 ? `${sockets.maxLink}-link` : '',
      sockets.total > 0 ? `${sockets.total} sockets` : '',
      raw.identified === false ? 'unidentified' : ''
    ].filter(Boolean)

    return {
      id: raw.id || crypto.randomUUID?.() || Math.random().toString(36),
      name: raw.name || '',
      baseType: raw.baseType || raw.typeLine || '',
      typeLine: raw.typeLine || '',
      rarity,
      frameType: raw.frameType,
      itemLevel: raw.ilvl || 0,
      icon: raw.icon || '',
      size: { w: raw.w || 1, h: raw.h || 1 },
      identified: raw.identified !== false,
      corrupted: raw.corrupted || false,
      sockets,
      stackSize: raw.stackSize || null,
      maxStackSize: raw.maxStackSize || null,
      mods: {
        implicit: raw.implicitMods || [],
        explicit: raw.explicitMods || [],
        crafted: raw.craftedMods || [],
        enchant: raw.enchantMods || [],
        fractured: raw.fracturedMods || [],
        utility: raw.utilityMods || []
      },
      properties: raw.properties || [],
      requirements: this.parseRequirements(raw.requirements),
      flavourText: raw.flavourText || [],
      descrText: raw.descrText || '',
      searchText: searchParts.join(' ').toLowerCase(),
      location: null // will be set by parseStashItem or parseCharacterItems
    }
  }

  parseSockets(rawSockets) {
    if (!rawSockets || rawSockets.length === 0) {
      return { total: 0, maxLink: 0, groups: [], colors: '' }
    }

    const groups = {}
    let colors = ''

    for (const socket of rawSockets) {
      const group = socket.group
      if (!groups[group]) groups[group] = 0
      groups[group]++
      colors += socket.sColour || socket.attr || '?'
    }

    const groupSizes = Object.values(groups)
    const maxLink = Math.max(...groupSizes, 0)

    return {
      total: rawSockets.length,
      maxLink,
      groups: groupSizes,
      colors
    }
  }

  parseRequirements(rawReqs) {
    if (!rawReqs) return {}
    const reqs = {}
    for (const req of rawReqs) {
      if (req.name && req.values && req.values[0]) {
        reqs[req.name.toLowerCase()] = parseInt(req.values[0][0]) || 0
      }
    }
    return reqs
  }
}

module.exports = { ItemParser }
