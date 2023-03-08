namespace ShooterlandEditor
{
    partial class ShooterlandEditor
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            this.frameTimer = new System.Windows.Forms.Timer(this.components);
            this.label1 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.initialDelayField = new System.Windows.Forms.NumericUpDown();
            this.delayField = new System.Windows.Forms.NumericUpDown();
            this.label3 = new System.Windows.Forms.Label();
            this.bottomSingleCheck = new System.Windows.Forms.CheckBox();
            this.rightSingleCheck = new System.Windows.Forms.CheckBox();
            this.bottomDoubleCheck = new System.Windows.Forms.CheckBox();
            this.rightDoubleCheck = new System.Windows.Forms.CheckBox();
            this.label4 = new System.Windows.Forms.Label();
            this.label5 = new System.Windows.Forms.Label();
            this.ttbField = new System.Windows.Forms.NumericUpDown();
            this.saveButton = new System.Windows.Forms.Button();
            this.loadButton = new System.Windows.Forms.Button();
            ((System.ComponentModel.ISupportInitialize)(this.initialDelayField)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.delayField)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.ttbField)).BeginInit();
            this.SuspendLayout();
            // 
            // frameTimer
            // 
            this.frameTimer.Tick += new System.EventHandler(this.Update);
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(17, 81);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(94, 13);
            this.label1.TabIndex = 0;
            this.label1.Text = "Right shooter size:";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(267, 46);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(119, 13);
            this.label2.TabIndex = 1;
            this.label2.Text = "Initial roscoe delay (ms):";
            // 
            // initialDelayField
            // 
            this.initialDelayField.Location = new System.Drawing.Point(392, 44);
            this.initialDelayField.Maximum = new decimal(new int[] {
            100000,
            0,
            0,
            0});
            this.initialDelayField.Name = "initialDelayField";
            this.initialDelayField.Size = new System.Drawing.Size(71, 20);
            this.initialDelayField.TabIndex = 4;
            // 
            // delayField
            // 
            this.delayField.Location = new System.Drawing.Point(392, 79);
            this.delayField.Maximum = new decimal(new int[] {
            100000,
            0,
            0,
            0});
            this.delayField.Name = "delayField";
            this.delayField.Size = new System.Drawing.Size(71, 20);
            this.delayField.TabIndex = 5;
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(17, 46);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(102, 13);
            this.label3.TabIndex = 6;
            this.label3.Text = "Bottom shooter size:";
            // 
            // bottomSingleCheck
            // 
            this.bottomSingleCheck.AutoSize = true;
            this.bottomSingleCheck.Location = new System.Drawing.Point(125, 45);
            this.bottomSingleCheck.Name = "bottomSingleCheck";
            this.bottomSingleCheck.Size = new System.Drawing.Size(53, 17);
            this.bottomSingleCheck.TabIndex = 11;
            this.bottomSingleCheck.Text = "single";
            this.bottomSingleCheck.UseVisualStyleBackColor = true;
            this.bottomSingleCheck.CheckStateChanged += new System.EventHandler(this.bottomSingleCheck_CheckedChanged);
            // 
            // rightSingleCheck
            // 
            this.rightSingleCheck.AutoSize = true;
            this.rightSingleCheck.Location = new System.Drawing.Point(125, 80);
            this.rightSingleCheck.Name = "rightSingleCheck";
            this.rightSingleCheck.Size = new System.Drawing.Size(53, 17);
            this.rightSingleCheck.TabIndex = 12;
            this.rightSingleCheck.Text = "single";
            this.rightSingleCheck.UseVisualStyleBackColor = true;
            this.rightSingleCheck.CheckStateChanged += new System.EventHandler(this.rightSingleCheck_CheckedChanged);
            // 
            // bottomDoubleCheck
            // 
            this.bottomDoubleCheck.AutoSize = true;
            this.bottomDoubleCheck.Location = new System.Drawing.Point(184, 45);
            this.bottomDoubleCheck.Name = "bottomDoubleCheck";
            this.bottomDoubleCheck.Size = new System.Drawing.Size(58, 17);
            this.bottomDoubleCheck.TabIndex = 13;
            this.bottomDoubleCheck.Text = "double";
            this.bottomDoubleCheck.UseVisualStyleBackColor = true;
            this.bottomDoubleCheck.CheckStateChanged += new System.EventHandler(this.bottomDoubleCheck_CheckedChanged);
            // 
            // rightDoubleCheck
            // 
            this.rightDoubleCheck.AutoSize = true;
            this.rightDoubleCheck.Location = new System.Drawing.Point(184, 80);
            this.rightDoubleCheck.Name = "rightDoubleCheck";
            this.rightDoubleCheck.Size = new System.Drawing.Size(58, 17);
            this.rightDoubleCheck.TabIndex = 14;
            this.rightDoubleCheck.Text = "double";
            this.rightDoubleCheck.UseVisualStyleBackColor = true;
            this.rightDoubleCheck.CheckStateChanged += new System.EventHandler(this.rightDoubleCheck_CheckedChanged);
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(267, 81);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(97, 13);
            this.label4.TabIndex = 15;
            this.label4.Text = "Roscoe delay (ms):";
            // 
            // label5
            // 
            this.label5.AutoSize = true;
            this.label5.Location = new System.Drawing.Point(493, 46);
            this.label5.Name = "label5";
            this.label5.Size = new System.Drawing.Size(57, 13);
            this.label5.TabIndex = 16;
            this.label5.Text = "TTB (sec):";
            // 
            // ttbField
            // 
            this.ttbField.Location = new System.Drawing.Point(556, 44);
            this.ttbField.Maximum = new decimal(new int[] {
            1000,
            0,
            0,
            0});
            this.ttbField.Name = "ttbField";
            this.ttbField.Size = new System.Drawing.Size(71, 20);
            this.ttbField.TabIndex = 17;
            // 
            // saveButton
            // 
            this.saveButton.Location = new System.Drawing.Point(20, 12);
            this.saveButton.Name = "saveButton";
            this.saveButton.Size = new System.Drawing.Size(75, 23);
            this.saveButton.TabIndex = 18;
            this.saveButton.Text = "Save";
            this.saveButton.UseVisualStyleBackColor = true;
            this.saveButton.Click += new System.EventHandler(this.saveButton_Click);
            // 
            // loadButton
            // 
            this.loadButton.Location = new System.Drawing.Point(115, 12);
            this.loadButton.Name = "loadButton";
            this.loadButton.Size = new System.Drawing.Size(75, 23);
            this.loadButton.TabIndex = 19;
            this.loadButton.Text = "Load";
            this.loadButton.UseVisualStyleBackColor = true;
            this.loadButton.Click += new System.EventHandler(this.loadButton_Click);
            // 
            // ShooterlandEditor
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(687, 578);
            this.Controls.Add(this.loadButton);
            this.Controls.Add(this.saveButton);
            this.Controls.Add(this.ttbField);
            this.Controls.Add(this.label5);
            this.Controls.Add(this.label4);
            this.Controls.Add(this.rightDoubleCheck);
            this.Controls.Add(this.bottomDoubleCheck);
            this.Controls.Add(this.rightSingleCheck);
            this.Controls.Add(this.bottomSingleCheck);
            this.Controls.Add(this.label3);
            this.Controls.Add(this.delayField);
            this.Controls.Add(this.initialDelayField);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.label1);
            this.Name = "ShooterlandEditor";
            this.Text = "Shooterland Editor";
            this.Paint += new System.Windows.Forms.PaintEventHandler(this.Draw);
            this.MouseClick += new System.Windows.Forms.MouseEventHandler(this.ShooterlandEditor_MouseClick);
            ((System.ComponentModel.ISupportInitialize)(this.initialDelayField)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.delayField)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.ttbField)).EndInit();
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Timer frameTimer;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.NumericUpDown initialDelayField;
        private System.Windows.Forms.NumericUpDown delayField;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.CheckBox bottomSingleCheck;
        private System.Windows.Forms.CheckBox rightSingleCheck;
        private System.Windows.Forms.CheckBox bottomDoubleCheck;
        private System.Windows.Forms.CheckBox rightDoubleCheck;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.Label label5;
        private System.Windows.Forms.NumericUpDown ttbField;
        private System.Windows.Forms.Button saveButton;
        private System.Windows.Forms.Button loadButton;
    }
}

