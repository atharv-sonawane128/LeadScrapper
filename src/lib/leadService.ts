import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc,
  orderBy
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export interface Lead {
  id: string;
  name: string;
  jobTitle: string;
  company: string;
  email: string;
  phone?: string;
  location: string;
  skills: string[];
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
  industry: string;
  companySize: string;
  source: string;
  scrapedAt: string;
  userId: string;
}

export interface LeadFilters {
  industry?: string;
  location?: string;
  companySize?: string;
  role?: string;
  keyword?: string;
}

export interface SearchHistory {
  id: string;
  userId: string;
  type: "LinkedIn" | "Website";
  query: string;
  resultsCount: number;
  status: "Success" | "Failed";
  timestamp: string;
}


// LocalStorage Mock DB implementation for sandbox mode
class MockLeadService {
  private getLeadsFromStore(): Lead[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("leadscraper_leads");
    return stored ? JSON.parse(stored) : [];
  }

  private saveLeadsToStore(leads: Lead[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem("leadscraper_leads", JSON.stringify(leads));
  }

  async addLead(userId: string, leadData: Omit<Lead, "id" | "userId" | "scrapedAt">): Promise<Lead> {
    const leads = this.getLeadsFromStore();
    const newLead: Lead = {
      ...leadData,
      id: `lead-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      scrapedAt: new Date().toISOString(),
    };
    leads.push(newLead);
    this.saveLeadsToStore(leads);
    return newLead;
  }

  async getLeads(userId: string, filters?: LeadFilters): Promise<Lead[]> {
    let leads = this.getLeadsFromStore().filter((l) => l.userId === userId);

    if (filters) {
      if (filters.industry) {
        leads = leads.filter((l) => l.industry.toLowerCase().includes(filters.industry!.toLowerCase()));
      }
      if (filters.location) {
        leads = leads.filter((l) => l.location.toLowerCase().includes(filters.location!.toLowerCase()));
      }
      if (filters.companySize) {
        leads = leads.filter((l) => l.companySize === filters.companySize);
      }
      if (filters.role) {
        leads = leads.filter((l) => l.jobTitle.toLowerCase().includes(filters.role!.toLowerCase()));
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        leads = leads.filter(
          (l) =>
            l.name.toLowerCase().includes(kw) ||
            l.company.toLowerCase().includes(kw) ||
            l.skills.some((s) => s.toLowerCase().includes(kw))
        );
      }
    }

    // Sort by scrapedAt desc
    return leads.sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime());
  }

  async deleteLead(leadId: string): Promise<void> {
    let leads = this.getLeadsFromStore();
    leads = leads.filter((l) => l.id !== leadId);
    this.saveLeadsToStore(leads);
  }

  async clearLeads(userId: string): Promise<void> {
    let leads = this.getLeadsFromStore();
    leads = leads.filter((l) => l.userId !== userId);
    this.saveLeadsToStore(leads);
  }

  // History mock methods
  private getHistoryFromStore(): SearchHistory[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("leadscraper_history");
    return stored ? JSON.parse(stored) : [];
  }

  private saveHistoryToStore(history: SearchHistory[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem("leadscraper_history", JSON.stringify(history));
  }

  async addHistory(userId: string, historyData: Omit<SearchHistory, "id" | "userId" | "timestamp">): Promise<SearchHistory> {
    const history = this.getHistoryFromStore();
    const newHistory: SearchHistory = {
      ...historyData,
      id: `history-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      timestamp: new Date().toISOString(),
    };
    history.push(newHistory);
    this.saveHistoryToStore(history);
    return newHistory;
  }

  async getHistory(userId: string): Promise<SearchHistory[]> {
    return this.getHistoryFromStore()
      .filter((h) => h.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async clearHistory(userId: string): Promise<void> {
    const history = this.getHistoryFromStore().filter((h) => h.userId !== userId);
    this.saveHistoryToStore(history);
  }
}

const mockLeadService = new MockLeadService();

export const leadService = {
  addLead: async (userId: string, leadData: Omit<Lead, "id" | "userId" | "scrapedAt">): Promise<Lead> => {
    if (isFirebaseConfigured && db) {
      const userLeadsCol = collection(db, "users", userId, "leads");
      const savedDoc = await addDoc(userLeadsCol, {
        ...leadData,
        scrapedAt: new Date().toISOString(),
      });
      return {
        ...leadData,
        id: savedDoc.id,
        userId,
        scrapedAt: new Date().toISOString(),
      };
    } else {
      return mockLeadService.addLead(userId, leadData);
    }
  },

  getLeads: async (userId: string, filters?: LeadFilters): Promise<Lead[]> => {
    if (isFirebaseConfigured && db) {
      const userLeadsCol = collection(db, "users", userId, "leads");
      const q = query(userLeadsCol, orderBy("scrapedAt", "desc"));
      const snapshot = await getDocs(q);
      let leads: Lead[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        leads.push({
          id: docSnap.id,
          userId,
          name: data.name || "",
          jobTitle: data.jobTitle || "",
          company: data.company || "",
          email: data.email || "",
          phone: data.phone || "",
          location: data.location || "",
          skills: data.skills || [],
          socialLinks: data.socialLinks || {},
          industry: data.industry || "",
          companySize: data.companySize || "",
          source: data.source || "",
          scrapedAt: data.scrapedAt || "",
        });
      });

      // Filter in memory for compatibility and to avoid Firestore composite index errors
      if (filters) {
        if (filters.industry) {
          leads = leads.filter((l) => l.industry.toLowerCase().includes(filters.industry!.toLowerCase()));
        }
        if (filters.location) {
          leads = leads.filter((l) => l.location.toLowerCase().includes(filters.location!.toLowerCase()));
        }
        if (filters.companySize) {
          leads = leads.filter((l) => l.companySize === filters.companySize);
        }
        if (filters.role) {
          leads = leads.filter((l) => l.jobTitle.toLowerCase().includes(filters.role!.toLowerCase()));
        }
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          leads = leads.filter(
            (l) =>
              l.name.toLowerCase().includes(kw) ||
              l.company.toLowerCase().includes(kw) ||
              l.skills.some((s) => s.toLowerCase().includes(kw))
          );
        }
      }
      return leads;
    } else {
      return mockLeadService.getLeads(userId, filters);
    }
  },

  deleteLead: async (userId: string, leadId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, "users", userId, "leads", leadId);
      await deleteDoc(docRef);
    } else {
      await mockLeadService.deleteLead(leadId);
    }
  },

  clearLeads: async (userId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      const userLeadsCol = collection(db, "users", userId, "leads");
      const snapshot = await getDocs(userLeadsCol);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, "users", userId, "leads", docSnap.id)));
      await Promise.all(deletePromises);
    } else {
      await mockLeadService.clearLeads(userId);
    }
  },

  addSearchHistory: async (userId: string, historyData: Omit<SearchHistory, "id" | "userId" | "timestamp">): Promise<SearchHistory> => {
    if (isFirebaseConfigured && db) {
      const userHistoryCol = collection(db, "users", userId, "history");
      const savedDoc = await addDoc(userHistoryCol, {
        ...historyData,
        timestamp: new Date().toISOString(),
      });
      return {
        ...historyData,
        id: savedDoc.id,
        userId,
        timestamp: new Date().toISOString(),
      };
    } else {
      return mockLeadService.addHistory(userId, historyData);
    }
  },

  getSearchHistory: async (userId: string): Promise<SearchHistory[]> => {
    if (isFirebaseConfigured && db) {
      const userHistoryCol = collection(db, "users", userId, "history");
      const q = query(userHistoryCol, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const history: SearchHistory[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        history.push({
          id: docSnap.id,
          userId,
          type: data.type || "LinkedIn",
          query: data.query || "",
          resultsCount: data.resultsCount || 0,
          status: data.status || "Success",
          timestamp: data.timestamp || "",
        });
      });
      return history;
    } else {
      return mockLeadService.getHistory(userId);
    }
  },

  clearSearchHistory: async (userId: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      const userHistoryCol = collection(db, "users", userId, "history");
      const snapshot = await getDocs(userHistoryCol);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, "users", userId, "history", docSnap.id)));
      await Promise.all(deletePromises);
    } else {
      await mockLeadService.clearHistory(userId);
    }
  }
};
