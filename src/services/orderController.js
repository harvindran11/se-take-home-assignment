const Order = require("../models/order");
const Bot = require("../models/bot");
const { padTrio, log } = require("../utils/helpers");

class orderController 
{

    constructor() 
    {
      this.orders = [];
      this.bots = [];
      this.completed = [];
      this.lastOrderId = 0;
      this.lastBotId = 0;
      this.hasOrders = false;
    }



    addOrder(type) 
    {
        const order = new Order(++this.lastOrderId, type);

        if (type === "VIP") 
        {
            const vipIndex = this.orders.findIndex(o => o.type !== "VIP");
            if (vipIndex === -1) this.orders.push(order);
            else this.orders.splice(vipIndex, 0, order);
        } 
        else 
        {
            this.orders.push(order);
        }

        log("New Order "+type+"#"+padTrio(order.id)+" - Status: PENDING");
        this.dispatch();
    }

    botNumber() 
    {
      log("System initialized with " + this.bots.length);
    }

    addBot() 
    {
        const bot = new Bot(++this.lastBotId);
        this.bots.push(bot);
        log("Added Bot #" + bot.id);
        this.dispatch();
    }

    removeBot() 
    {
      if (this.bots.length === 0) return;

      const bot = this.bots.pop();
      const unfinishedOrder = bot.stop();

      if (unfinishedOrder) 
      {
        unfinishedOrder.status = "PENDING";
        if (unfinishedOrder.type === "VIP") 
        {
          const vipIndex = this.orders.findIndex(o => o.type !== "VIP");
          if (vipIndex === -1) 
          {
              this.orders.push(unfinishedOrder);
          } 
          else 
          {
              this.orders.splice(vipIndex, 0, unfinishedOrder);
          }
        } 
        else 
        {
            this.orders.push(unfinishedOrder);
        }
        log("Bot #"+bot.id+" removed — Returning Order "+unfinishedOrder.type+"#"+padTrio(unfinishedOrder.id));
      } 
      else 
      {
        log("Bot #"+bot.id+" removed");
      }
      this.dispatch();
    }

    dispatch() 
    {
      let anyAssigned = false;
      for (let bot of this.bots) 
      {
        if (!bot.isBusy && this.orders.length > 0) 
        {
          const order = this.orders.shift();
          order.status = "PROCESSING";
          this.hasOrders = true;

          log("Bot #"+bot.id+" started Order "+order.type+"#"+padTrio(order.id)+" Status: "+order.status);
          anyAssigned = true;

          bot.assignOrder(order, (completed) => 
          {
            completed.status = "COMPLETED";
            completed.completedAt = new Date();
            this.completed.push(completed);
            log("Order "+completed.type+"#"+padTrio(completed.id)+" - Status: "+completed.status);
            this.dispatch();
          });
        }

        if (!anyAssigned && this.hasOrders) 
        {
          const allDone = this.orders.length === 0 && this.bots.every(b => !b.isBusy);
          if (allDone) 
          {
            this.assignStatus();
          }
        }
      }
    }

    assignStatus()
    {
      log("", true);
      const totalVIP = this.completed.filter(o => o.type === "VIP").length;
      const totalNormal = this.completed.filter(o => o.type === "NORMAL").length;
      const totalCompleted = this.completed.filter(o => o.status === "COMPLETED").length;
      const totalPending = this.completed.filter(o => o.status === "PENDING").length;
      log("Final Status:", true);
      log("- Total Orders Processed: "+this.completed.length+" ("+totalVIP+" VIP, "+totalNormal+" Normal)", true);
      log("- Orders Completed: "+totalCompleted, true);
      log("- Active Bots: "+this.bots.length, true);
      log("- Pending Orders: "+totalPending, true);
    }
}

module.exports = orderController;
