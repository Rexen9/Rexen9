
const SubOwner = require('../schema/subowner');

class SubOwnerHandler {
  constructor(client) {
    this.client = client;
    this.cache = new Map();
    this.loadSubOwners();
  }

  async loadSubOwners() {
    try {
      const subOwners = await SubOwner.find({ isSubOwner: true });
      subOwners.forEach(owner => {
        this.cache.set(owner.userId, owner);
      });
      console.log(`[SUB-OWNER] Loaded ${subOwners.length} sub-owners`);
    } catch (error) {
      console.error('[SUB-OWNER] Error loading sub-owners:', error);
    }
  }

  async isSubOwner(userId) {
    // Check cache first
    if (this.cache.has(userId)) {
      return true;
    }

    // Check database
    try {
      const subOwner = await SubOwner.findOne({ userId: userId, isSubOwner: true });
      if (subOwner) {
        this.cache.set(userId, subOwner);
        return true;
      }
    } catch (error) {
      console.error('[SUB-OWNER] Error checking sub-owner status:', error);
    }

    return false;
  }

  async addSubOwner(userId, addedBy, reason = "No reason provided") {
    try {
      const subOwner = await SubOwner.create({
        userId: userId,
        isSubOwner: true,
        addedBy: addedBy,
        addedAt: new Date(),
        reason: reason
      });
      
      this.cache.set(userId, subOwner);
      return true;
    } catch (error) {
      console.error('[SUB-OWNER] Error adding sub-owner:', error);
      return false;
    }
  }

  async removeSubOwner(userId) {
    try {
      await SubOwner.deleteOne({ userId: userId });
      this.cache.delete(userId);
      return true;
    } catch (error) {
      console.error('[SUB-OWNER] Error removing sub-owner:', error);
      return false;
    }
  }

  // Check if user is main owner or sub-owner
  async hasOwnerPermissions(userId) {
    const config = require('../config');
    const isMainOwner = Array.isArray(config.ownerID) 
      ? config.ownerID.includes(userId) 
      : userId === config.ownerID;
    return isMainOwner || await this.isSubOwner(userId);
  }

  // Check if user has limited owner permissions (for specific commands)
  async hasLimitedOwnerPermissions(userId) {
    return await this.isSubOwner(userId);
  }
}

module.exports = SubOwnerHandler;
